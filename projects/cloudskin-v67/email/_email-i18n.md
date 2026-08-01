# CLOUDSKIN transactional email — i18n strings (11 languages)

Complete translation set for the 3 customer notifications: order-confirmation, shipping-confirmation, shipping-update.
Languages, fixed order everywhere: `en · el · ar · es · it · fr · de · nl · pt · sv · ru`.
46 keys total: 8 shared + 17 order-confirmation + 7 shipping-confirmation + 14 shipping-update.

## Wiring guardrails (read first)

- **Use DOUBLE quotes in every `{% assign %}`.** Some values contain apostrophes (Greek `καθ' οδόν`, French `s'active` / `l'adresse`, Italian `all'inizio` / `dell'ordine`). A single-quoted assign would break on these. No value contains a `"` character, so double quotes are always safe.
- **8 keys are marked `[INLINE]`** — they contain a `{{ variable }}` or the email link. Liquid does NOT interpolate `{{ }}` inside an assigned string, so wire the `{% case lang %}` directly in the HTML where the English sits now, keeping the variable / `<a>` in place. The inline keys are: `order.preheader`, `ship.preheader`, `update.preheader`, `order.thankYouNamed`, `ship.introNamed`, `update.introNamed`, `order.paymentLine`, `help.line`.
- **Never translated (brand constants), leave exactly as-is:** `CLOUDSKIN` wordmark, `CS` monogram tile, `DHL Express` carrier fallback, `PayPal`, `info@cloudskin.com`, and everything inside `{{ }}` / `{% %}`.
- **Defaults used:** German `du`, European Portuguese, `value.complimentary` = nearest natural premium word per language. Zero em-dashes.
- Register: informal es/it/de/nl/pt/sv, formal fr/ru, Greek polite plural (σας).

### Drop-in pattern example

```liquid
{%- assign lang = attributes.lang | default: 'en' -%}
{%- case lang -%}
  {%- when 'el' -%}{%- assign t_total = "Σύνολο" -%}
  {%- when 'ar' -%}{%- assign t_total = "الإجمالي" -%}
  {%- else -%}{%- assign t_total = "Total" -%}
{%- endcase -%}
```

---

# PART 1 — SHARED strings (used across templates)

### `label.order` — eyebrow before `{{ order.name }}` · all 3 templates
```
en  Order
el  Παραγγελία
ar  الطلب
es  Pedido
it  Ordine
fr  Commande
de  Bestellung
nl  Bestelling
pt  Encomenda
sv  Order
ru  Заказ
```

### `label.quantity` — before `{{ line.quantity }}` · order-confirmation + shipping-confirmation
```
en  Quantity
el  Ποσότητα
ar  الكمية
es  Cantidad
it  Quantità
fr  Quantité
de  Menge
nl  Aantal
pt  Quantidade
sv  Antal
ru  Количество
```

### `label.carrier` · shipping-confirmation + shipping-update
```
en  Carrier
el  Μεταφορέας
ar  شركة الشحن
es  Transportista
it  Corriere
fr  Transporteur
de  Versandpartner
nl  Vervoerder
pt  Transportadora
sv  Transportör
ru  Служба доставки
```

### `label.trackingNumber` · shipping-confirmation + shipping-update
```
en  Tracking number
el  Αριθμός εντοπισμού
ar  رقم التتبع
es  Número de seguimiento
it  Numero di tracciamento
fr  Numéro de suivi
de  Sendungsnummer
nl  Trackingnummer
pt  Número de seguimento
sv  Spårningsnummer
ru  Номер отслеживания
```

### `cta.trackOrder` — button · shipping-confirmation + shipping-update
```
en  Track your order
el  Παρακολουθήστε την παραγγελία σας
ar  تتبع طلبك
es  Sigue tu pedido
it  Traccia il tuo ordine
fr  Suivre votre commande
de  Bestellung verfolgen
nl  Volg je bestelling
pt  Seguir a tua encomenda
sv  Spåra din beställning
ru  Отследить заказ
```

### `help.line` `[INLINE]` — the email is a link; keep `<a>…</a>` where `[info@cloudskin.com]` sits, period after · all 3 templates
```
en  Questions about your order? We are here to help at [info@cloudskin.com].
el  Έχετε απορίες για την παραγγελία σας; Είμαστε εδώ για να σας βοηθήσουμε στο [info@cloudskin.com].
ar  هل لديك أسئلة حول طلبك؟ نحن هنا لمساعدتك عبر [info@cloudskin.com].
es  ¿Tienes preguntas sobre tu pedido? Estamos aquí para ayudarte en [info@cloudskin.com].
it  Hai domande sul tuo ordine? Siamo qui per aiutarti all'indirizzo [info@cloudskin.com].
fr  Des questions sur votre commande ? Nous sommes là pour vous aider à l'adresse [info@cloudskin.com].
de  Fragen zu deiner Bestellung? Wir helfen dir gerne unter [info@cloudskin.com].
nl  Vragen over je bestelling? We helpen je graag via [info@cloudskin.com].
pt  Tens dúvidas sobre a tua encomenda? Estamos aqui para te ajudar em [info@cloudskin.com].
sv  Har du frågor om din beställning? Vi hjälper dig gärna på [info@cloudskin.com].
ru  Есть вопросы по заказу? Мы будем рады помочь по адресу [info@cloudskin.com].
```

### `footer.city` — after `CLOUDSKIN ·` · all 3 templates
```
en  Dubai
el  Ντουμπάι
ar  دبي
es  Dubái
it  Dubai
fr  Dubaï
de  Dubai
nl  Dubai
pt  Dubai
sv  Dubai
ru  Дубай
```

### `footer.tagline` · all 3 templates
```
en  Luxury activewear. Tennis, padel, studio.
el  Αθλητική ένδυση πολυτελείας. Τένις, πάντελ, στούντιο.
ar  ملابس رياضية فاخرة. تنس، بادل، استوديو.
es  Ropa deportiva de lujo. Tenis, pádel, estudio.
it  Abbigliamento sportivo di lusso. Tennis, padel, studio.
fr  Vêtements de sport de luxe. Tennis, padel, studio.
de  Luxuriöse Sportbekleidung. Tennis, Padel, Studio.
nl  Luxe sportkleding. Tennis, padel, studio.
pt  Roupa desportiva de luxo. Ténis, padel, estúdio.
sv  Lyxiga träningskläder. Tennis, padel, studio.
ru  Роскошная спортивная одежда. Теннис, падел, студия.
```

---

# PART 2 — ORDER CONFIRMATION (unique)

### `order.preheader` `[INLINE]` — hidden inbox-preview text
```
en  Your CLOUDSKIN order {{ order.name }} is confirmed. Thank you.
el  Η παραγγελία σας {{ order.name }} από την CLOUDSKIN επιβεβαιώθηκε. Σας ευχαριστούμε.
ar  تم تأكيد طلبك {{ order.name }} من CLOUDSKIN. شكرًا لك.
es  Tu pedido {{ order.name }} de CLOUDSKIN está confirmado. Gracias.
it  Il tuo ordine {{ order.name }} di CLOUDSKIN è confermato. Grazie.
fr  Votre commande CLOUDSKIN {{ order.name }} est confirmée. Merci.
de  Deine CLOUDSKIN-Bestellung {{ order.name }} ist bestätigt. Vielen Dank.
nl  Je CLOUDSKIN-bestelling {{ order.name }} is bevestigd. Bedankt.
pt  A tua encomenda {{ order.name }} da CLOUDSKIN está confirmada. Obrigado.
sv  Din CLOUDSKIN-beställning {{ order.name }} är bekräftad. Tack.
ru  Ваш заказ CLOUDSKIN {{ order.name }} подтверждён. Спасибо.
```

### `order.title` — headline
```
en  Your order is confirmed.
el  Η παραγγελία σας επιβεβαιώθηκε.
ar  تم تأكيد طلبك.
es  Tu pedido está confirmado.
it  Il tuo ordine è confermato.
fr  Votre commande est confirmée.
de  Deine Bestellung ist bestätigt.
nl  Je bestelling is bevestigd.
pt  A tua encomenda está confirmada.
sv  Din beställning är bekräftad.
ru  Ваш заказ подтверждён.
```

### `order.thankYouNamed` `[INLINE]` — the `{% if first_name %}` branch
```
en  Thank you, {{ order.customer.first_name }}.
el  Σας ευχαριστούμε, {{ order.customer.first_name }}.
ar  شكرًا لك، {{ order.customer.first_name }}.
es  Gracias, {{ order.customer.first_name }}.
it  Grazie, {{ order.customer.first_name }}.
fr  Merci, {{ order.customer.first_name }}.
de  Vielen Dank, {{ order.customer.first_name }}.
nl  Bedankt, {{ order.customer.first_name }}.
pt  Obrigado, {{ order.customer.first_name }}.
sv  Tack, {{ order.customer.first_name }}.
ru  Спасибо, {{ order.customer.first_name }}.
```

### `order.thankYouPlain` — the `{% else %}` branch
```
en  Thank you.
el  Σας ευχαριστούμε.
ar  شكرًا لك.
es  Gracias.
it  Grazie.
fr  Merci.
de  Vielen Dank.
nl  Bedankt.
pt  Obrigado.
sv  Tack.
ru  Спасибо.
```

### `order.intro` — sentence after the thank-you
```
en  We are delighted to welcome you to CLOUDSKIN. Your order has been received and is now being prepared with care.
el  Με μεγάλη χαρά σας καλωσορίζουμε στην CLOUDSKIN. Λάβαμε την παραγγελία σας και την ετοιμάζουμε με φροντίδα.
ar  يسعدنا أن نرحب بك في CLOUDSKIN. لقد استلمنا طلبك ونعمل على تجهيزه بعناية.
es  Nos complace darte la bienvenida a CLOUDSKIN. Hemos recibido tu pedido y lo estamos preparando con esmero.
it  Siamo felici di darti il benvenuto in CLOUDSKIN. Abbiamo ricevuto il tuo ordine e lo stiamo preparando con cura.
fr  Nous sommes ravis de vous accueillir chez CLOUDSKIN. Votre commande a bien été reçue et nous la préparons avec soin.
de  Wir freuen uns, dich bei CLOUDSKIN willkommen zu heißen. Deine Bestellung ist bei uns eingegangen und wird nun sorgfältig vorbereitet.
nl  We heten je van harte welkom bij CLOUDSKIN. Je bestelling is binnen en wordt nu met zorg klaargemaakt.
pt  É com muito prazer que te damos as boas-vindas à CLOUDSKIN. Recebemos a tua encomenda e estamos a prepará-la com todo o cuidado.
sv  Det gläder oss att välkomna dig till CLOUDSKIN. Vi har tagit emot din beställning och förbereder den nu med omsorg.
ru  Рады приветствовать вас в CLOUDSKIN. Мы получили ваш заказ и бережно готовим его.
```

### `label.subtotal`
```
en  Subtotal
el  Υποσύνολο
ar  المجموع الفرعي
es  Subtotal
it  Subtotale
fr  Sous-total
de  Zwischensumme
nl  Subtotaal
pt  Subtotal
sv  Delsumma
ru  Промежуточный итог
```

### `label.shipping` — totals row
```
en  Shipping
el  Αποστολή
ar  الشحن
es  Envío
it  Spedizione
fr  Livraison
de  Versand
nl  Verzending
pt  Envio
sv  Frakt
ru  Доставка
```

### `value.complimentary` — free-shipping value (nearest natural premium word per language)
```
en  Complimentary
el  Δωρεάν
ar  مجانًا
es  Cortesía
it  Omaggio
fr  Offerte
de  Kostenlos
nl  Gratis
pt  Oferta
sv  Kostnadsfritt
ru  Бесплатно
```

### `label.discount`
```
en  Discount
el  Έκπτωση
ar  الخصم
es  Descuento
it  Sconto
fr  Remise
de  Rabatt
nl  Korting
pt  Desconto
sv  Rabatt
ru  Скидка
```

### `label.total`
```
en  Total
el  Σύνολο
ar  الإجمالي
es  Total
it  Totale
fr  Total
de  Gesamt
nl  Totaal
pt  Total
sv  Totalt
ru  Итого
```

### `label.payment` — eyebrow
```
en  Payment
el  Πληρωμή
ar  الدفع
es  Pago
it  Pagamento
fr  Paiement
de  Zahlung
nl  Betaling
pt  Pagamento
sv  Betalning
ru  Оплата
```

### `label.card` — the `pay_label` default (`PayPal` stays untranslated)
```
en  Card
el  Κάρτα
ar  بطاقة
es  Tarjeta
it  Carta
fr  Carte
de  Karte
nl  Kaart
pt  Cartão
sv  Kort
ru  Карта
```

### `order.paymentLine` `[INLINE]` — `{{ pay_label }}` = the localized Card or PayPal
```
en  Paid with {{ pay_label }}. Duties and taxes included.
el  Πληρωμή με {{ pay_label }}. Περιλαμβάνονται δασμοί και φόροι.
ar  تم الدفع بواسطة {{ pay_label }}. الرسوم الجمركية والضرائب مشمولة.
es  Pagado con {{ pay_label }}. Aranceles e impuestos incluidos.
it  Pagato con {{ pay_label }}. Dazi e imposte inclusi.
fr  Payé avec {{ pay_label }}. Droits de douane et taxes inclus.
de  Bezahlt mit {{ pay_label }}. Zölle und Steuern inbegriffen.
nl  Betaald met {{ pay_label }}. Invoerrechten en belastingen inbegrepen.
pt  Pago com {{ pay_label }}. Direitos aduaneiros e impostos incluídos.
sv  Betalt med {{ pay_label }}. Tull och skatt ingår.
ru  Оплачено с помощью {{ pay_label }}. Пошлины и налоги включены.
```

### `label.shipTo` — eyebrow above the address
```
en  Shipping to
el  Αποστολή προς
ar  الشحن إلى
es  Envío a
it  Spedizione a
fr  Expédition à
de  Versand an
nl  Verzending naar
pt  Envio para
sv  Skickas till
ru  Адрес доставки
```

### `order.trackingTitle` — callout box title
```
en  Tracking your order
el  Παρακολούθηση της παραγγελίας σας
ar  تتبع طلبك
es  Seguimiento de tu pedido
it  Tracciamento dell'ordine
fr  Suivi de votre commande
de  Sendungsverfolgung
nl  Je bestelling volgen
pt  Seguimento da tua encomenda
sv  Följ din beställning
ru  Отслеживание заказа
```

### `order.trackingBody` — the 24-hour grace paragraph
```
en  Your tracking link activates within 24 hours of dispatch. We will email it the moment your order is on its way, and you can follow it any time from the button below.
el  Ο σύνδεσμος παρακολούθησης ενεργοποιείται εντός 24 ωρών από την αποστολή. Θα σας τον στείλουμε με email μόλις η παραγγελία σας ξεκινήσει το ταξίδι της προς εσάς, και μπορείτε να την παρακολουθείτε όποτε θέλετε από το κουμπί παρακάτω.
ar  يتم تفعيل رابط التتبع خلال 24 ساعة من الشحن. سنرسله إليك عبر البريد الإلكتروني بمجرد أن يبدأ طلبك رحلته إليك، ويمكنك متابعته في أي وقت من الزر أدناه.
es  Tu enlace de seguimiento se activa en las 24 horas siguientes al envío. Te lo enviaremos por correo en cuanto tu pedido esté en camino, y podrás seguirlo en cualquier momento desde el botón de abajo.
it  Il tuo link di tracciamento si attiva entro 24 ore dalla spedizione. Te lo invieremo via email non appena il tuo ordine sarà in viaggio, e potrai seguirlo in qualsiasi momento dal pulsante qui sotto.
fr  Votre lien de suivi s'active dans les 24 heures suivant l'expédition. Nous vous l'enverrons par e-mail dès que votre commande sera en route, et vous pourrez la suivre à tout moment depuis le bouton ci-dessous.
de  Dein Tracking-Link wird innerhalb von 24 Stunden nach dem Versand aktiviert. Wir senden ihn dir per E-Mail, sobald deine Bestellung unterwegs ist, und du kannst sie jederzeit über den Button unten verfolgen.
nl  Je trackinglink wordt binnen 24 uur na verzending geactiveerd. We mailen hem zodra je bestelling onderweg is, en je kunt je bestelling op elk moment volgen via de knop hieronder.
pt  O teu link de seguimento é ativado nas 24 horas seguintes ao envio. Enviamos-to por email assim que a tua encomenda estiver a caminho e podes segui-la a qualquer momento através do botão abaixo.
sv  Din spårningslänk aktiveras inom 24 timmar efter avsändning. Vi mejlar den så snart din beställning är på väg, och du kan följa den när som helst via knappen nedan.
ru  Ссылка для отслеживания активируется в течение 24 часов после отправки. Мы пришлём её по электронной почте, как только ваш заказ будет в пути, и вы сможете следить за ним в любое время по кнопке ниже.
```

### `cta.viewOrder` — button
```
en  View your order
el  Δείτε την παραγγελία σας
ar  عرض طلبك
es  Ver tu pedido
it  Vedi il tuo ordine
fr  Voir votre commande
de  Bestellung ansehen
nl  Bekijk je bestelling
pt  Ver a tua encomenda
sv  Visa din beställning
ru  Посмотреть заказ
```

---

# PART 3 — SHIPPING CONFIRMATION (unique)

Also uses shared keys from PART 1: `label.order`, `label.carrier`, `label.trackingNumber`, `cta.trackOrder`, `label.quantity`, `help.line`, `footer.city`, `footer.tagline`.

### `ship.preheader` `[INLINE]`
```
en  Your CLOUDSKIN order {{ order.name }} is on its way.
el  Η παραγγελία σας {{ order.name }} από την CLOUDSKIN βρίσκεται καθ' οδόν.
ar  طلبك {{ order.name }} من CLOUDSKIN في طريقه إليك.
es  Tu pedido {{ order.name }} de CLOUDSKIN está en camino.
it  Il tuo ordine {{ order.name }} di CLOUDSKIN è in viaggio.
fr  Votre commande CLOUDSKIN {{ order.name }} est en route.
de  Deine CLOUDSKIN-Bestellung {{ order.name }} ist unterwegs.
nl  Je CLOUDSKIN-bestelling {{ order.name }} is onderweg.
pt  A tua encomenda {{ order.name }} da CLOUDSKIN está a caminho.
sv  Din CLOUDSKIN-beställning {{ order.name }} är på väg.
ru  Ваш заказ CLOUDSKIN {{ order.name }} уже в пути.
```

### `ship.title` — headline
```
en  Your order is on its way.
el  Η παραγγελία σας βρίσκεται καθ' οδόν.
ar  طلبك في طريقه إليك.
es  Tu pedido está en camino.
it  Il tuo ordine è in viaggio.
fr  Votre commande est en route.
de  Deine Bestellung ist unterwegs.
nl  Je bestelling is onderweg.
pt  A tua encomenda está a caminho.
sv  Din beställning är på väg.
ru  Ваш заказ в пути.
```

### `ship.introNamed` `[INLINE]` — the `{% if first_name %}` branch, name woven in
```
en  {{ order.customer.first_name }}, your CLOUDSKIN order has been dispatched and is making its way to you. Follow every step with the tracking below.
el  {{ order.customer.first_name }}, η παραγγελία σας από την CLOUDSKIN στάλθηκε και ταξιδεύει προς εσάς. Παρακολουθήστε κάθε της βήμα με τα στοιχεία εντοπισμού παρακάτω.
ar  {{ order.customer.first_name }}، تم شحن طلبك من CLOUDSKIN وهو في طريقه إليك. تابع كل خطوة عبر بيانات التتبع أدناه.
es  {{ order.customer.first_name }}, tu pedido de CLOUDSKIN se ha enviado y está de camino. Sigue cada paso con el seguimiento que encontrarás más abajo.
it  {{ order.customer.first_name }}, il tuo ordine CLOUDSKIN è stato spedito ed è in viaggio verso di te. Segui ogni fase con il tracciamento qui sotto.
fr  {{ order.customer.first_name }}, votre commande CLOUDSKIN a été expédiée et fait route vers vous. Suivez chaque étape grâce au suivi ci-dessous.
de  {{ order.customer.first_name }}, deine CLOUDSKIN-Bestellung wurde versandt und ist auf dem Weg zu dir. Verfolge jeden Schritt mit den Tracking-Daten unten.
nl  {{ order.customer.first_name }}, je CLOUDSKIN-bestelling is verzonden en is onderweg naar je toe. Volg elke stap met de tracking hieronder.
pt  {{ order.customer.first_name }}, a tua encomenda CLOUDSKIN foi enviada e está a caminho de ti. Segue cada passo com os dados de seguimento abaixo.
sv  {{ order.customer.first_name }}, din CLOUDSKIN-beställning har skickats och är på väg till dig. Följ varje steg med spårningen nedan.
ru  {{ order.customer.first_name }}, ваш заказ CLOUDSKIN отправлен и уже едет к вам. Следите за каждым его шагом по данным отслеживания ниже.
```

### `ship.introPlain` — the `{% else %}` branch
```
en  Your CLOUDSKIN order has been dispatched and is making its way to you. Follow every step with the tracking below.
el  Η παραγγελία σας από την CLOUDSKIN στάλθηκε και ταξιδεύει προς εσάς. Παρακολουθήστε κάθε της βήμα με τα στοιχεία εντοπισμού παρακάτω.
ar  تم شحن طلبك من CLOUDSKIN وهو في طريقه إليك. تابع كل خطوة عبر بيانات التتبع أدناه.
es  Tu pedido de CLOUDSKIN se ha enviado y está de camino. Sigue cada paso con el seguimiento que encontrarás más abajo.
it  Il tuo ordine CLOUDSKIN è stato spedito ed è in viaggio verso di te. Segui ogni fase con il tracciamento qui sotto.
fr  Votre commande CLOUDSKIN a été expédiée et fait route vers vous. Suivez chaque étape grâce au suivi ci-dessous.
de  Deine CLOUDSKIN-Bestellung wurde versandt und ist auf dem Weg zu dir. Verfolge jeden Schritt mit den Tracking-Daten unten.
nl  Je CLOUDSKIN-bestelling is verzonden en is onderweg naar je toe. Volg elke stap met de tracking hieronder.
pt  A tua encomenda CLOUDSKIN foi enviada e está a caminho de ti. Segue cada passo com os dados de seguimento abaixo.
sv  Din CLOUDSKIN-beställning har skickats och är på väg till dig. Följ varje steg med spårningen nedan.
ru  Ваш заказ CLOUDSKIN отправлен и уже едет к вам. Следите за каждым его шагом по данным отслеживания ниже.
```

### `ship.graceNote` — first-scan grace paragraph
```
en  Your first tracking scan can take a few hours to appear after dispatch. If the link looks quiet at first, it will update soon.
el  Η πρώτη σάρωση εντοπισμού μπορεί να χρειαστεί μερικές ώρες για να εμφανιστεί μετά την αποστολή. Αν ο σύνδεσμος δεν δείχνει κάτι στην αρχή, θα ενημερωθεί σύντομα.
ar  قد يستغرق أول تحديث للتتبع بضع ساعات ليظهر بعد الشحن. وإذا بدا الرابط خاليًا في البداية، فسيتم تحديثه قريبًا.
es  El primer registro de seguimiento puede tardar unas horas en aparecer tras el envío. Si al principio el enlace parece inactivo, se actualizará pronto.
it  La prima registrazione del tracciamento può richiedere qualche ora per comparire dopo la spedizione. Se all'inizio il link sembra fermo, si aggiornerà presto.
fr  Le premier scan de suivi peut prendre quelques heures à apparaître après l'expédition. Si le lien semble inactif au début, il se mettra à jour très vite.
de  Die erste Sendungserfassung kann nach dem Versand einige Stunden dauern, bis sie erscheint. Wirkt der Link anfangs noch ruhig, wird er sich bald aktualisieren.
nl  De eerste trackingscan kan na verzending een paar uur duren voordat hij verschijnt. Lijkt de link in het begin nog stil, dan wordt hij snel bijgewerkt.
pt  O primeiro registo de seguimento pode demorar algumas horas a aparecer após o envio. Se ao início o link parecer parado, será atualizado em breve.
sv  Den första spårningsregistreringen kan ta några timmar att visas efter avsändning. Om länken verkar tyst i början uppdateras den snart.
ru  Первое обновление трекинга может появиться через несколько часов после отправки. Если поначалу по ссылке ничего нет, она скоро обновится.
```

### `ship.inThisShipment` — eyebrow
```
en  In this shipment
el  Σε αυτή την αποστολή
ar  في هذه الشحنة
es  En este envío
it  In questa spedizione
fr  Dans cet envoi
de  In dieser Sendung
nl  In deze zending
pt  Neste envio
sv  I denna försändelse
ru  В этой посылке
```

### `label.deliveringTo` — eyebrow above the address (distinct from `label.shipTo`)
```
en  Delivering to
el  Παράδοση προς
ar  التوصيل إلى
es  Entrega a
it  Consegna a
fr  Livraison à
de  Lieferung an
nl  Bezorgen aan
pt  Entrega para
sv  Levereras till
ru  Доставляем по адресу
```

---

# PART 4 — SHIPPING UPDATE (unique)

Also uses shared keys from PART 1: `label.order`, `label.carrier`, `label.trackingNumber`, `cta.trackOrder`, `help.line`, `footer.city`, `footer.tagline`.
Status set maps to `{% case fulfillment.shipment_status %}`: each `status.*` fills `status_label`; the two `headline.*` override `headline` (all other statuses keep `update.headlineDefault`).

### `update.preheader` `[INLINE]`
```
en  An update on your CLOUDSKIN delivery, order {{ order.name }}.
el  Μια ενημέρωση για την παράδοσή σας από την CLOUDSKIN, παραγγελία {{ order.name }}.
ar  تحديث بشأن توصيل طلبك من CLOUDSKIN، الطلب {{ order.name }}.
es  Una actualización sobre tu entrega de CLOUDSKIN, pedido {{ order.name }}.
it  Un aggiornamento sulla tua consegna CLOUDSKIN, ordine {{ order.name }}.
fr  Une mise à jour sur votre livraison CLOUDSKIN, commande {{ order.name }}.
de  Ein Update zu deiner CLOUDSKIN-Lieferung, Bestellung {{ order.name }}.
nl  Een update over je CLOUDSKIN-levering, bestelling {{ order.name }}.
pt  Uma atualização sobre a tua entrega CLOUDSKIN, encomenda {{ order.name }}.
sv  En uppdatering om din CLOUDSKIN-leverans, order {{ order.name }}.
ru  Обновление по вашей доставке CLOUDSKIN, заказ {{ order.name }}.
```

### `update.headlineDefault` — headline when no special carrier status (the `{% assign headline %}` default)
```
en  An update on your delivery.
el  Μια ενημέρωση για την παράδοσή σας.
ar  تحديث بشأن توصيل طلبك.
es  Una actualización sobre tu entrega.
it  Un aggiornamento sulla tua consegna.
fr  Une mise à jour sur votre livraison.
de  Ein Update zu deiner Lieferung.
nl  Een update over je levering.
pt  Uma atualização sobre a tua entrega.
sv  En uppdatering om din leverans.
ru  Новости о вашей доставке.
```

### `update.introNamed` `[INLINE]` — the `{% if first_name %}` branch
```
en  {{ order.customer.first_name }}, here is the latest on your CLOUDSKIN order. Follow its journey any time with the button below.
el  {{ order.customer.first_name }}, ακολουθούν τα τελευταία νέα για την παραγγελία σας από την CLOUDSKIN. Παρακολουθήστε το ταξίδι της όποτε θέλετε με το κουμπί παρακάτω.
ar  {{ order.customer.first_name }}، إليك آخر المستجدات حول طلبك من CLOUDSKIN. تابع رحلته في أي وقت عبر الزر أدناه.
es  {{ order.customer.first_name }}, estas son las últimas novedades sobre tu pedido de CLOUDSKIN. Sigue su recorrido cuando quieras con el botón de abajo.
it  {{ order.customer.first_name }}, ecco le ultime novità sul tuo ordine CLOUDSKIN. Segui il suo percorso quando vuoi con il pulsante qui sotto.
fr  {{ order.customer.first_name }}, voici les dernières nouvelles de votre commande CLOUDSKIN. Suivez son parcours à tout moment grâce au bouton ci-dessous.
de  {{ order.customer.first_name }}, hier ist das Neueste zu deiner CLOUDSKIN-Bestellung. Verfolge ihren Weg jederzeit über den Button unten.
nl  {{ order.customer.first_name }}, hier is het laatste nieuws over je CLOUDSKIN-bestelling. Volg de bezorging wanneer je wilt via de knop hieronder.
pt  {{ order.customer.first_name }}, aqui ficam as últimas novidades sobre a tua encomenda CLOUDSKIN. Segue o seu percurso quando quiseres através do botão abaixo.
sv  {{ order.customer.first_name }}, här är det senaste om din CLOUDSKIN-beställning. Följ dess resa när du vill med knappen nedan.
ru  {{ order.customer.first_name }}, вот последние новости о вашем заказе CLOUDSKIN. Следите за его путешествием в любое время по кнопке ниже.
```

### `update.introPlain` — the `{% else %}` branch
```
en  Here is the latest on your CLOUDSKIN order. Follow its journey any time with the button below.
el  Ακολουθούν τα τελευταία νέα για την παραγγελία σας από την CLOUDSKIN. Παρακολουθήστε το ταξίδι της όποτε θέλετε με το κουμπί παρακάτω.
ar  إليك آخر المستجدات حول طلبك من CLOUDSKIN. تابع رحلته في أي وقت عبر الزر أدناه.
es  Estas son las últimas novedades sobre tu pedido de CLOUDSKIN. Sigue su recorrido cuando quieras con el botón de abajo.
it  Ecco le ultime novità sul tuo ordine CLOUDSKIN. Segui il suo percorso quando vuoi con il pulsante qui sotto.
fr  Voici les dernières nouvelles de votre commande CLOUDSKIN. Suivez son parcours à tout moment grâce au bouton ci-dessous.
de  Hier ist das Neueste zu deiner CLOUDSKIN-Bestellung. Verfolge ihren Weg jederzeit über den Button unten.
nl  Hier is het laatste nieuws over je CLOUDSKIN-bestelling. Volg de bezorging wanneer je wilt via de knop hieronder.
pt  Aqui ficam as últimas novidades sobre a tua encomenda CLOUDSKIN. Segue o seu percurso quando quiseres através do botão abaixo.
sv  Här är det senaste om din CLOUDSKIN-beställning. Följ dess resa när du vill med knappen nedan.
ru  Вот последние новости о вашем заказе CLOUDSKIN. Следите за его путешествием в любое время по кнопке ниже.
```

### `label.status` — eyebrow
```
en  Status
el  Κατάσταση
ar  الحالة
es  Estado
it  Stato
fr  Statut
de  Status
nl  Status
pt  Estado
sv  Status
ru  Статус
```

### `status.inTransit` — `when 'in_transit'`
```
en  In transit
el  Σε μεταφορά
ar  قيد النقل
es  En tránsito
it  In transito
fr  En transit
de  Unterwegs
nl  Onderweg
pt  Em trânsito
sv  Under transport
ru  В пути
```

### `status.outForDelivery` — `when 'out_for_delivery'` (the `status_label`)
```
en  Out for delivery
el  Προς παράδοση
ar  خرج للتوصيل
es  En reparto
it  In consegna
fr  En cours de livraison
de  In Zustellung
nl  Wordt bezorgd
pt  Em distribuição
sv  Ute för leverans
ru  Передан курьеру
```

### `headline.outForDelivery` — `when 'out_for_delivery'` (the headline override)
```
en  Out for delivery.
el  Προς παράδοση.
ar  خرج للتوصيل.
es  En reparto.
it  In consegna.
fr  En cours de livraison.
de  In Zustellung.
nl  Wordt bezorgd.
pt  Em distribuição.
sv  Ute för leverans.
ru  Передан курьеру.
```

### `status.attemptedDelivery` — `when 'attempted_delivery'`
```
en  Delivery attempted
el  Έγινε προσπάθεια παράδοσης
ar  جرت محاولة توصيل
es  Entrega intentada
it  Consegna tentata
fr  Livraison tentée
de  Zustellung versucht
nl  Bezorging geprobeerd
pt  Entrega tentada
sv  Leveransförsök
ru  Попытка доставки
```

### `status.readyForPickup` — `when 'ready_for_pickup'`
```
en  Ready for pickup
el  Έτοιμο για παραλαβή
ar  جاهز للاستلام
es  Listo para recoger
it  Pronto per il ritiro
fr  Prêt pour le retrait
de  Zur Abholung bereit
nl  Klaar om af te halen
pt  Pronto para levantamento
sv  Redo för upphämtning
ru  Готов к получению
```

### `status.delivered` — `when 'delivered'` (the `status_label`)
```
en  Delivered
el  Παραδόθηκε
ar  تم التوصيل
es  Entregado
it  Consegnato
fr  Livré
de  Zugestellt
nl  Bezorgd
pt  Entregue
sv  Levererad
ru  Доставлен
```

### `headline.delivered` — `when 'delivered'` (the headline override)
```
en  Delivered.
el  Παραδόθηκε.
ar  تم التوصيل.
es  Entregado.
it  Consegnato.
fr  Livré.
de  Zugestellt.
nl  Bezorgd.
pt  Entregue.
sv  Levererad.
ru  Доставлен.
```

### `status.confirmed` — `when 'confirmed'`
```
en  Confirmed
el  Επιβεβαιώθηκε
ar  تم التأكيد
es  Confirmado
it  Confermato
fr  Confirmé
de  Bestätigt
nl  Bevestigd
pt  Confirmado
sv  Bekräftad
ru  Подтверждён
```

### `status.failure` — `when 'failure'`
```
en  Delivery issue
el  Πρόβλημα παράδοσης
ar  مشكلة في التوصيل
es  Incidencia en la entrega
it  Problema di consegna
fr  Problème de livraison
de  Zustellproblem
nl  Bezorgprobleem
pt  Problema na entrega
sv  Leveransproblem
ru  Проблема с доставкой
```

---

# Coverage note

Every visible string in all 3 templates is covered (46 keys: 8 shared + 17 order-confirmation + 7 shipping-confirmation + 14 shipping-update). Nothing inside `{{ }}` / `{% %}` was touched. The `<title>` tags are intentionally excluded (mail clients do not render them; the customer sees Shopify's Subject field, which lives outside these bodies). Optional `<title>` connective words and the Shopify Subject lines can be localized on request.
