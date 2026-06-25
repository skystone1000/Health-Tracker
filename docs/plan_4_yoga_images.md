# Plan 4 — Yoga asana images: generation prompts, file names & UI integration

Everything you need to generate, name, save and ship illustrations for every yoga
asana in the app. The UI integration is **already wired** (Phase below) — drop a
correctly-named file into the folder and it appears automatically, replacing the
🧘 placeholder.

> **Status note.** The current `public/images/asanas/*.webp` batch has been
> regenerated to avoid the earlier wooden-mannequin look: no ball-joint holes,
> no tube/sausage limbs, no dotted outlines, and no striped/vignette background.
> Keep using the prompts and reference workflow below for future replacements.

---

## 1. How this works (already integrated)

- **Convention, not config.** Each asana's image path is derived from its `id`:
  `public/images/asanas/<id>.webp` → served at `/images/asanas/<id>.webp`.
  Helper: [`asanaImageUrl`](../src/lib/images.ts).
- **Graceful fallback.** [`AsanaImage`](../src/features/yoga/AsanaImage.tsx) shows
  a 🧘 placeholder until the file exists, then swaps to the real image on load.
  Used in the library cards and the asana detail modal. It uses contained square
  artwork so the full-body pose remains visible instead of being cropped.
- **You do:** generate each image with the prompt below, name it exactly
  `<id>.webp`, and place it in `public/images/asanas/`. Nothing else to change.

### File format & size

| Property | Value |
|---|---|
| Format | **WebP** (`.webp`) — best size/quality for web |
| Aspect | **1:1 square** (cards/detail contain the full figure) |
| Resolution | **1024×1024** (or 768×768) |
| Target size | ≤ ~150 KB each (compress after export) |
| Filename | exactly the asana **`id`** + `.webp` (lowercase, hyphens) |
| Folder | `public/images/asanas/` |

> Most image models output PNG/JPG. Convert to WebP afterward, e.g.
> `cwebp -q 82 tadasana.png -o tadasana.webp`, or any online converter. The
> filename's **base must equal the asana id** (see the per-asana list below).

---

## 2. Art-direction (read before generating)

Use the **same style for all 42** so the library looks cohesive. Every prompt in
§3 already embeds this style prefix and a negative prompt — keep them identical
across images so only the *pose* changes.

**Target look:** match [`docs/assets/yoga-asana-style-reference.png`](assets/yoga-asana-style-reference.png)
and [`tadasana.webp`](../public/images/asanas/tadasana.webp) — a polished,
semi-flat illustration of **one real adult woman**: believable full-body human
proportions, a visible face with soft features and a neat hair bun, natural
muscle/limb volume, fitted sage-green sports bra + leggings, warm cream
background, gentle floor shadow.

**Shared style prefix (already in every §3 prompt):**

> *Soft semi-flat instructional illustration of one real adult woman practicing
> yoga, calm wellness aesthetic, in the exact style of the reference image:
> realistic full-body human proportions with natural muscle, joint and limb
> volume, a clearly visible face with soft features and hair in a neat top bun,
> smooth skin with gentle soft shading, wearing a fitted sage-green sports bra
> and matching full-length leggings, barefoot, plain warm cream background, soft
> even lighting with a subtle floor shadow, the whole body centered and fully
> inside the frame, clean and uncluttered, no text, no labels, no watermark,
> square 1:1 composition.*

**Shared negative prompt (already in every §3 prompt):**

> *Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint
> doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or
> stitched outlines, stick figure, robot, blank or faceless head, missing
> facial features, deformed or extra hands/feet/limbs, multiple people,
> concentric-square or striped background texture, busy background, cropped or
> out-of-frame body, text, words, logo, watermark.*

If your model has no separate negative field, append the negative prompt to the
main prompt. Keep **one figure only**, neutral and non-sexualised, whole body in
frame, plain background.

### ⚠️ When a pose is unclear — get an online reference first

A text prompt alone often gets complex poses wrong (inversions, arm balances,
twists, and anything where limbs overlap). **Before generating those, look up a
reference photo** so the limb placement is correct — accurate anatomy matters
more than style polish:

1. Search the pose by name — e.g. *"Bakasana crow pose yoga photo"* (each §3
   block lists a **Reference search** query to use).
2. Confirm what's actually touching the floor, which limb is in front, and where
   the gaze goes.
3. If your tool supports an **image/reference input**, feed both the style
   reference (`assets/yoga-asana-style-reference.png`) **and** a pose reference
   photo, then apply the §3 text prompt.
4. Compare the result against the reference and the checklist in the block; if
   the joints look like a mannequin or the pose is wrong, regenerate.

### Online reference sources used for the current batch

The current regeneration used the saved style reference plus online pose
descriptions/photos to verify limb placement. These pages were used as reference
checks for the complex/ambiguous families:

- Standing and balance: [Virabhadrasana](https://en.wikipedia.org/wiki/Virabhadrasana),
  [Trikonasana](https://en.wikipedia.org/wiki/Trikonasana),
  [Ardha Chandrasana](https://en.wikipedia.org/wiki/Ardha_chandrasana).
- Backbends: [Cobra Pose](https://en.wikipedia.org/wiki/Cobra_pose),
  [Ustrasana](https://en.wikipedia.org/wiki/Ustrasana),
  [Dhanurasana](https://en.wikipedia.org/wiki/Dhanurasana).
- Inversions and arm balances: [Chaturanga Dandasana](https://en.wikipedia.org/wiki/Chaturanga_Dandasana),
  [Bakasana](https://en.wikipedia.org/wiki/Bakasana), and the Wikipedia
  [asana index](https://en.wikipedia.org/wiki/Asana) links for Halasana,
  Sarvangasana, Sirsasana, Vasisthasana and related poses.
- Restorative and seated references: [Balasana](https://en.wikipedia.org/wiki/Balasana)
  and the same asana index for meditation seats, lotus, bound angle and
  forward-bend family checks.

---

## 3. Prompts for every asana (42)

Each block is copy-paste ready (style prefix + negative prompt included). The
line above each block is the **exact path/filename** to save to, plus a
**Reference search** query to pull a pose photo if needed.

### Standing

**Mountain Pose — `tadasana`** → `public/images/asanas/tadasana.webp`
Reference search: "Tadasana mountain pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Mountain Pose (Tadasana) — standing tall and straight, feet together and flat, arms relaxed at the sides with palms facing the thighs, shoulders soft, spine long, gaze forward. Front view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Warrior I — `virabhadrasana-i`** → `public/images/asanas/virabhadrasana-i.webp`
Reference search: "Virabhadrasana I warrior 1 pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Warrior I (Virabhadrasana I) — a deep standing lunge, front knee bent to about ninety degrees stacked directly over the front ankle, back leg straight with the back foot planted at an angle, hips and chest squared toward the front, both arms extended straight overhead with palms facing each other, gaze lifted upward. Three-quarter front view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Warrior II — `virabhadrasana-ii`** → `public/images/asanas/virabhadrasana-ii.webp`
Reference search: "Virabhadrasana II warrior 2 pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Warrior II (Virabhadrasana II) — a wide-legged stance, front knee bent over the ankle and back leg straight, torso upright and facing the side, both arms extended straight out at shoulder height parallel to the floor (one reaching forward, one back), gaze over the front fingertips. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Chair Pose — `utkatasana`** → `public/images/asanas/utkatasana.webp`
Reference search: "Utkatasana chair pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Chair Pose (Utkatasana) — standing with feet together, knees bent and hips sitting back and down as if lowering onto an invisible chair, torso leaning slightly forward, both arms reaching up overhead alongside the ears with palms facing each other. Three-quarter view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Triangle Pose — `trikonasana`** → `public/images/asanas/trikonasana.webp`
Reference search: "Trikonasana triangle pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Triangle Pose (Trikonasana) — a wide straight-legged stance, torso tilted sideways over the straight front leg, the lower hand reaching down to the shin or ankle, the upper arm extended straight toward the ceiling so both arms form one vertical line, chest open and facing forward, gaze up to the top hand. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Balance

**Tree Pose — `vrksasana`** → `public/images/asanas/vrksasana.webp`
Reference search: "Vrksasana tree pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Tree Pose (Vrksasana) — balancing on one straight standing leg, the sole of the other foot pressed flat against the inner standing thigh with that bent knee opening out to the side, palms pressed together at the chest in prayer, spine tall and steady. Front view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Half Moon Pose — `ardha-chandrasana`** → `public/images/asanas/ardha-chandrasana.webp`
Reference search: "Ardha Chandrasana half moon pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Half Moon Pose (Ardha Chandrasana) — balancing on one straight standing leg with the other leg lifted straight out behind to hip height parallel to the floor, the lower hand resting on the floor a little ahead of the standing foot, the top arm reaching straight up, chest rotated open to the side. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Seated

**Easy Pose — `sukhasana`** → `public/images/asanas/sukhasana.webp`
Reference search: "Sukhasana easy pose seated yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Easy Pose (Sukhasana) — sitting cross-legged on the floor with the shins crossed, spine tall and relaxed, hands resting on the knees, shoulders soft. Front view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Staff Pose — `dandasana`** → `public/images/asanas/dandasana.webp`
Reference search: "Dandasana staff pose seated yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Staff Pose (Dandasana) — sitting upright on the floor with both legs extended straight forward and together, feet flexed, spine tall, hands pressing into the floor beside the hips. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Bound Angle Pose — `baddha-konasana`** → `public/images/asanas/baddha-konasana.webp`
Reference search: "Baddha Konasana bound angle butterfly pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Bound Angle Pose (Baddha Konasana) — sitting upright with the soles of the feet pressed together and the knees dropped open toward the floor like a butterfly, both hands clasping the feet, spine tall. Front view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Cow Face Pose — `gomukhasana`** → `public/images/asanas/gomukhasana.webp`
Reference search: "Gomukhasana cow face pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Cow Face Pose (Gomukhasana) — seated with the knees bent and stacked one directly on top of the other in the midline, both arms clasped behind the back: one elbow points up with that hand reaching down the back, the other elbow points down with that hand reaching up to clasp it. Three-quarter back view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Lotus Pose — `padmasana`** → `public/images/asanas/padmasana.webp`
Reference search: "Padmasana lotus pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Lotus Pose (Padmasana) — seated cross-legged in full lotus with each foot resting on top of the opposite thigh, spine tall, hands resting on the knees in a gentle mudra, serene. Front view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Forward bends

**Seated Forward Bend — `paschimottanasana`** → `public/images/asanas/paschimottanasana.webp`
Reference search: "Paschimottanasana seated forward bend yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Seated Forward Bend (Paschimottanasana) — sitting with both legs extended straight forward, folding the torso forward from the hips over the legs, hands reaching to hold the feet, spine lengthening toward the toes. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Standing Forward Bend — `uttanasana`** → `public/images/asanas/uttanasana.webp`
Reference search: "Uttanasana standing forward bend yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Standing Forward Bend (Uttanasana) — standing with straight legs, folding the torso all the way forward from the hips, chest drawing toward the thighs, hands reaching to the floor or holding the ankles, head and neck relaxed downward. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Head-to-Knee Forward Bend — `janu-sirsasana`** → `public/images/asanas/janu-sirsasana.webp`
Reference search: "Janu Sirsasana head to knee forward bend yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Head-to-Knee Forward Bend (Janu Sirsasana) — seated with one leg extended straight forward and the other knee bent with that foot tucked against the inner thigh, folding the torso forward over the straight leg, hands reaching toward the extended foot. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Downward-Facing Dog — `adho-mukha-svanasana`** → `public/images/asanas/adho-mukha-svanasana.webp`
Reference search: "Adho Mukha Svanasana downward facing dog yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Downward-Facing Dog (Adho Mukha Svanasana) — an inverted V shape, both hands and both feet flat on the floor, hips lifted high toward the ceiling, arms and spine forming one long straight line, legs straight with heels reaching down toward the floor, head relaxed between the arms. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Backbends

**Cobra Pose — `bhujangasana`** → `public/images/asanas/bhujangasana.webp`
Reference search: "Bhujangasana cobra pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Cobra Pose (Bhujangasana) — lying face down with the legs and hips on the floor, hands planted under the shoulders, elbows hugging the ribs, chest and head lifting up and forward into a gentle backbend, gaze forward. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Bridge Pose — `setu-bandhasana`** → `public/images/asanas/setu-bandhasana.webp`
Reference search: "Setu Bandhasana bridge pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Bridge Pose (Setu Bandha Sarvangasana) — lying on the back with knees bent and feet flat on the floor hip-width apart, hips lifted up into a bridge, shoulders and arms grounded alongside the body, chest rising. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Camel Pose — `ustrasana`** → `public/images/asanas/ustrasana.webp`
Reference search: "Ustrasana camel pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Camel Pose (Ustrasana) — kneeling upright with shins on the floor, hips pressing forward, the back arching as both hands reach back to hold the heels, chest and throat opening toward the ceiling. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Bow Pose — `dhanurasana`** → `public/images/asanas/dhanurasana.webp`
Reference search: "Dhanurasana bow pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Bow Pose (Dhanurasana) — lying face down, both knees bent, both hands reaching back to hold the ankles, chest and thighs lifting off the floor so the body curves like a drawn bow. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Upward-Facing Dog — `urdhva-mukha-svanasana`** → `public/images/asanas/urdhva-mukha-svanasana.webp`
Reference search: "Urdhva Mukha Svanasana upward facing dog yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Upward-Facing Dog (Urdhva Mukha Svanasana) — lying face down then pressing up on straight arms, chest and thighs lifted clear off the floor, only the hands and the tops of the feet touching down, shoulders drawing back and gaze lifted. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Fish Pose — `matsyasana`** → `public/images/asanas/matsyasana.webp`
Reference search: "Matsyasana fish pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Fish Pose (Matsyasana) — lying on the back with the legs extended straight, the chest arched up high, the crown of the head resting lightly on the floor, forearms and hands tucked under the hips for support. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Twists

**Half Lord of the Fishes — `ardha-matsyendrasana`** → `public/images/asanas/ardha-matsyendrasana.webp`
Reference search: "Ardha Matsyendrasana half lord of the fishes seated twist yoga photo"
Reference photo: https://en.wikipedia.org/wiki/Matsyendrasana (Ardha Matsyendrasana redirects here)
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Half Lord of the Fishes (Ardha Matsyendrasana) — a seated spinal twist, one leg bent with the foot planted flat on the floor outside the opposite bent leg, the torso twisting toward the top knee, the opposite elbow braced against the outside of that knee, the other hand resting on the floor behind the hips, gaze over the back shoulder. Three-quarter view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Supine Spinal Twist — `supta-matsyendrasana`** → `public/images/asanas/supta-matsyendrasana.webp`
Reference search: "Supta Matsyendrasana supine spinal twist yoga photo"
Reference photo: https://en.wikipedia.org/wiki/Jathara_Parivartanasana (reclined-twist family; knee drawn across the body)
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Supine Spinal Twist (Supta Matsyendrasana) — lying on the back, one knee drawn up and across the body toward the floor on the opposite side, both arms stretched out wide in a T shape, head turned away from the dropped knee. Slightly elevated side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Lateral bend

**Gate Pose — `parighasana`** → `public/images/asanas/parighasana.webp`
Reference search: "Parighasana gate pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Gate Pose (Parighasana) — kneeling on one knee with the other leg extended straight out to the side with the foot flat on the floor, the torso side-bending over the extended leg, the lower hand resting along that shin and the top arm arcing up and over the head. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Kneeling

**Cat–Cow Pose — `marjaryasana-bitilasana`** → `public/images/asanas/marjaryasana-bitilasana.webp`
Reference search: "Marjaryasana cat pose tabletop yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Cat–Cow Pose (Marjaryasana–Bitilasana) — on hands and knees in a tabletop position, wrists under the shoulders and knees under the hips, the spine rounding up toward the ceiling with the head dropping down (cat variation). Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Thunderbolt Pose — `vajrasana`** → `public/images/asanas/vajrasana.webp`
Reference search: "Vajrasana thunderbolt kneeling pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Thunderbolt Pose (Vajrasana) — kneeling with shins on the floor and sitting back on the heels, spine tall, hands resting on the thighs, calm and upright. Three-quarter view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Squatting

**Garland Pose — `malasana`** → `public/images/asanas/malasana.webp`
Reference search: "Malasana garland yogi squat pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Garland Pose (Malasana) — a deep squat with feet flat on the floor and knees wide apart, hips low toward the floor, palms pressed together at the chest with the elbows pressing the inner knees open. Front view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Reclining

**Reclining Bound Angle — `supta-baddha-konasana`** → `public/images/asanas/supta-baddha-konasana.webp`
Reference search: "Supta Baddha Konasana reclining bound angle pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Reclining Bound Angle (Supta Baddha Konasana) — lying on the back, relaxed, the soles of the feet together and knees dropped open to the sides, arms resting on the floor by the sides with palms up, restful. Slightly elevated front view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Inversions

**Supported Shoulderstand — `salamba-sarvangasana`** → `public/images/asanas/salamba-sarvangasana.webp`
Reference search: "Salamba Sarvangasana supported shoulderstand yoga photo"
Reference photo: https://en.wikipedia.org/wiki/Sarvangasana
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Supported Shoulderstand (Salamba Sarvangasana) — balanced vertically on the shoulders and upper arms, legs and hips reaching straight up toward the ceiling in one line, both hands supporting the mid-back, chin gently toward the chest. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Plough Pose — `halasana`** → `public/images/asanas/halasana.webp`
Reference search: "Halasana plough plow pose yoga photo"
Reference photo: https://en.wikipedia.org/wiki/Halasana
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Plough Pose (Halasana) — lying on the shoulders with the hips lifted and both legs extended up and over the head so the toes reach the floor behind the head, arms resting flat on the floor or hands supporting the back. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Headstand — `sirsasana`** → `public/images/asanas/sirsasana.webp`
Reference search: "Sirsasana supported headstand yoga photo"
Reference photo: https://en.wikipedia.org/wiki/Shirshasana
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Headstand (Sirsasana) — balanced upside down, the crown of the head and the forearms on the floor with the hands clasped cradling the back of the head, legs extended straight up toward the ceiling, the whole body in one vertical line. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Arm balances

**Crow Pose — `bakasana`** → `public/images/asanas/bakasana.webp`
Reference search: "Bakasana crow pose arm balance yoga photo"
Reference photo: https://en.wikipedia.org/wiki/Bakasana
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Crow Pose (Bakasana) — a forward arm balance, both hands flat on the floor shoulder-width apart with arms slightly bent, both knees resting high on the backs of the upper arms, both feet lifted off the floor, weight balanced forward, gaze ahead. Three-quarter side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Four-Limbed Staff Pose — `chaturanga-dandasana`** → `public/images/asanas/chaturanga-dandasana.webp`
Reference search: "Chaturanga Dandasana low plank yoga photo"
Reference photo: https://en.wikipedia.org/wiki/Chaturanga_Dandasana
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Four-Limbed Staff Pose (Chaturanga Dandasana) — a low plank hovering just above the floor, body in one straight line from head to heels supported on the toes and the hands, elbows bent to about ninety degrees and hugging close to the ribs. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Side Plank Pose — `vasisthasana`** → `public/images/asanas/vasisthasana.webp`
Reference search: "Vasisthasana side plank pose yoga photo"
Reference photo: https://en.wikipedia.org/wiki/Utthita_Vasisthasana
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Side Plank Pose (Vasisthasana) — a side plank balancing on one straight supporting arm with the hand under the shoulder and the body in one straight diagonal line resting on the outer edge of the lower foot, the top arm reaching straight up toward the ceiling, gaze up. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Restorative

**Child's Pose — `balasana`** → `public/images/asanas/balasana.webp`
Reference search: "Balasana child's pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Child's Pose (Balasana) — kneeling and folding forward, the torso resting down over the thighs, the forehead resting on the floor, arms extended forward on the floor, fully relaxed. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Legs-Up-the-Wall Pose — `viparita-karani`** → `public/images/asanas/viparita-karani.webp`
Reference search: "Viparita Karani legs up the wall pose yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Legs-Up-the-Wall Pose (Viparita Karani) — lying on the back close to a wall with both legs resting straight up against the wall, hips near the wall, arms relaxed on the floor by the sides, calm. Side view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Corpse Pose — `savasana`** → `public/images/asanas/savasana.webp`
Reference search: "Savasana corpse pose relaxation yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Corpse Pose (Savasana) — lying flat on the back, legs relaxed and slightly apart, arms a little away from the body with palms facing up, eyes closed, completely relaxed. Slightly elevated view from above.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

### Pranayama & meditation

**Alternate Nostril Breathing — `nadi-shodhana`** → `public/images/asanas/nadi-shodhana.webp`
Reference search: "Nadi Shodhana alternate nostril breathing seated yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Alternate Nostril Breathing (Nadi Shodhana) — seated cross-legged with a tall spine, one hand lifted to the face with the thumb and ring finger gently closing one nostril at a time, the other hand resting on the knee, eyes closed, calm. Front view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Skull-Shining Breath — `kapalabhati`** → `public/images/asanas/kapalabhati.webp`
Reference search: "Kapalabhati breathing seated cross-legged yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Skull-Shining Breath (Kapalabhati) — seated cross-legged with a tall spine, both hands resting on the knees, abdomen gently drawn in, eyes closed, focused rhythmic breathing. Front view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Humming Bee Breath — `bhramari`** → `public/images/asanas/bhramari.webp`
Reference search: "Bhramari humming bee breath seated yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Humming Bee Breath (Bhramari) — seated cross-legged with a tall spine, fingertips gently resting over closed eyes with thumbs lightly closing the ears, serene humming meditation. Front view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

**Seated Meditation — `dhyana`** → `public/images/asanas/dhyana.webp`
Reference search: "Dhyana seated meditation cross-legged yoga photo"
```
Soft semi-flat instructional illustration of one real adult woman practicing yoga, calm wellness aesthetic, in the exact style of the reference image: realistic full-body human proportions with natural muscle, joint and limb volume, a clearly visible face with soft features and hair in a neat top bun, smooth skin with gentle soft shading, wearing a fitted sage-green sports bra and matching full-length leggings, barefoot, plain warm cream background, soft even lighting with a subtle floor shadow, the whole body centered and fully inside the frame, clean and uncluttered, no text, no labels, no watermark, square 1:1 composition. Pose: Seated Meditation (Dhyana) — seated cross-legged in a calm meditation posture, hands resting on the knees in a gentle mudra, eyes closed, spine tall, peaceful. Front view.
Negative prompt: wooden artist mannequin, posable wooden doll, ball-joint doll, segmented or tube or sausage limbs, hollow oval joint holes, dotted or stitched outlines, stick figure, robot, blank or faceless head, missing facial features, deformed or extra hands/feet/limbs, multiple people, concentric-square or striped background texture, busy background, cropped or out-of-frame body, text, words, logo, watermark.
```

---

## 4. After you add images

- No code change needed — refresh the Yoga library; placeholders become images.
- **Quality check each one before committing:** it must read as a *real human*
  (face, hair, natural limbs) in the correct pose — **not** a wooden mannequin or
  tube-limbed figure. If it doesn't, pull the **Reference search** photo and
  regenerate (see §2's "When a pose is unclear").
- Verify a few in the browser (cards + the asana detail modal).
- Commit the `.webp` files under `public/images/asanas/`.

## 5. When new asanas are added

Adding an asana (see [`ADD_YOGA_ASANA.md`](ADD_YOGA_ASANA.md)) means adding one
image here too:

1. Copy the **style prefix** and **negative prompt** (§2) and append a one-line
   pose description plus a **Reference search** query.
2. If the pose is complex, pull a reference photo first (§2).
3. Save the export as `public/images/asanas/<new-id>.webp`.
4. Add a matching prompt block to §3 of this file so the set stays complete.

> Maintenance: if the image **convention changes** (folder, format, or the
> `AsanaImage` behaviour), update §1 here and `src/lib/images.ts` together.
