// Brand-fitted background (black + electric blue) — adapted from the supplied
// background-snippets.tsx. Faint white grid over near-black with a soft blue glow.
export const Component = () => {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-navy bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:6rem_4rem]">
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_820px_at_100%_180px,rgba(51,102,255,0.22),transparent)]"></div>
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_600px_at_0%_90%,rgba(51,102,255,0.10),transparent)]"></div>
    </div>
  );
};

export default Component;
