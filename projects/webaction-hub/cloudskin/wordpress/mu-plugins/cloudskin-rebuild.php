<?php
/**
 * Plugin Name: CloudSkin Journal auto-rebuild
 * Description: When a writer publishes, updates, or trashes a post, pings the
 *              CloudSkin blog-rebuild endpoint so cloudskin.com/blog regenerates
 *              itself (headless SSG bridge). No GitHub token lives here, only a
 *              rotatable shared secret.
 * Version:     1.0.0
 * Author:      Web Action
 *
 * INSTALL (EasyWP / any WordPress):
 *   Upload this file to  wp-content/mu-plugins/cloudskin-rebuild.php
 *   (create the mu-plugins folder if it does not exist). Files in mu-plugins are
 *   "must-use": they activate automatically, with no Plugins-screen step.
 *
 * CONFIGURE: set the shared secret below (CLOUDSKIN_REBUILD_SECRET) to the SAME
 *   value stored as BLOG_REBUILD_SECRET on the Supabase blog-rebuild function.
 *   Prefer defining it in wp-config.php instead of editing this file, e.g.:
 *       define('CLOUDSKIN_REBUILD_SECRET', 'the-shared-secret');
 */

if (!defined('ABSPATH')) {
    exit; // never accessible directly
}

// The CloudSkin blog-rebuild edge function (Supabase). No secrets in this URL.
if (!defined('CLOUDSKIN_REBUILD_URL')) {
    define('CLOUDSKIN_REBUILD_URL', 'https://ocszztflphqsaoyhlerx.supabase.co/functions/v1/blog-rebuild');
}

// The shared secret. MUST equal BLOG_REBUILD_SECRET on the edge function.
// Leave the placeholder and the plugin stays inert (it will not ping anything).
if (!defined('CLOUDSKIN_REBUILD_SECRET')) {
    define('CLOUDSKIN_REBUILD_SECRET', 'PASTE_SHARED_SECRET_HERE');
}

/**
 * Fire on any post reaching (or being re-saved in) the "publish" state.
 * This covers first publish AND edits to an already-live post.
 */
add_action('transition_post_status', function ($new_status, $old_status, $post) {
    if (!($post instanceof WP_Post)) {
        return;
    }
    if ($post->post_type !== 'post') {
        return; // only blog posts, not pages / menu items / products
    }
    if ($new_status !== 'publish') {
        return; // drafts, pending, scheduled-not-yet-live: ignore
    }
    if (wp_is_post_revision($post) || wp_is_post_autosave($post)) {
        return;
    }
    cloudskin_ping_rebuild($post->ID, $post->post_name, 'publish');
}, 10, 3);

/**
 * Also rebuild when a published post is trashed / unpublished, so it disappears
 * from cloudskin.com/blog on the next build.
 */
add_action('trashed_post', function ($post_id) {
    if (get_post_type($post_id) !== 'post') {
        return;
    }
    cloudskin_ping_rebuild($post_id, get_post_field('post_name', $post_id), 'trashed');
});

/**
 * POST the rebuild ping. Non-blocking (never delays the editor), debounced so the
 * publish flow (which can fire the status hook twice) triggers at most one build
 * per post per 10 seconds. The GitHub Action itself also collapses a burst of
 * dispatches into a single deploy (concurrency: cancel-in-progress).
 */
function cloudskin_ping_rebuild($post_id, $slug, $status) {
    $secret = CLOUDSKIN_REBUILD_SECRET;
    if (empty($secret) || $secret === 'PASTE_SHARED_SECRET_HERE') {
        return; // not configured yet -> stay inert
    }

    $flag = 'cloudskin_rebuilt_' . (int) $post_id;
    if (get_transient($flag)) {
        return; // already pinged for this post in the last 10s
    }
    set_transient($flag, 1, 10);

    wp_remote_post(CLOUDSKIN_REBUILD_URL, array(
        'method'      => 'POST',
        'blocking'    => false, // fire-and-forget: do not hold up the save
        'timeout'     => 3,
        'redirection' => 0,
        'headers'     => array(
            'Content-Type'       => 'application/json',
            'x-cloudskin-secret' => $secret,
        ),
        'body'        => wp_json_encode(array(
            'post_id' => (int) $post_id,
            'slug'    => (string) $slug,
            'status'  => (string) $status,
            'action'  => 'publish',
        )),
    ));
}
