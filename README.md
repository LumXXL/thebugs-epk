# The Bugs — EPK

Single-scroll electronic press kit for The Bugs (Toronto electroclash duo).
Live at [iamabug.netlify.app](https://iamabug.netlify.app)

---

## How to update content

### Change copy (text)

Open `index.html` and find the section you want to edit. Everything is plain HTML — just change the text between the tags.

| Section | What to look for |
|---------|-----------------|
| Tagline | `<p class="hero__tagline">` |
| Track descriptions | `<span class="track-note">` inside each `.track-card` |
| Bio | `<div class="bio-text">` |
| Shows (past) | `<ul class="shows-list">` in the first `.shows-col` |
| Shows (upcoming) | `<ul class="shows-list">` in the second `.shows-col` |
| Booker info | `<div class="bookers-body">` |
| Footer tagline | `<p class="footer-tagline">` |

**Adding a new show:**
```html
<li class="show-item">
  <span class="show-venue">Venue Name</span>
  <span class="show-date">Month Year</span>
</li>
```

**Marking a show as upcoming (yellow highlight):**
```html
<li class="show-item show-item--next">
  <div class="show-main">
    <span class="show-venue">The Venue</span>
    <span class="show-city">Toronto</span>
  </div>
  <span class="show-date">May 23, 2026</span>
</li>
```

---

### Swap photos

Drop new images into the `Photos/` folder, then update the `src` attribute in `index.html`:

```html
<!-- Hero photo -->
<img src="Photos/YOUR-NEW-PHOTO.jpg" alt="describe the photo" class="hero-img">

<!-- Bio photos -->
<img src="Photos/YOUR-PHOTO-1.jpg" alt="..." loading="lazy">
```

Keep alt text descriptive for accessibility.

---

### Add real video footage

Find this comment in `index.html`:

```
<!-- VIDEO CONFIG — to add real footage, replace each video-card's ...
```

For each video card, replace the `<div class="video-placeholder">` with a real video:

**Local file:**
```html
<video controls preload="none" poster="Photos/thumbnail.jpg">
  <source src="Video/your-clip.mp4" type="video/mp4">
</video>
```

**YouTube embed:**
```html
<iframe
  src="https://www.youtube.com/embed/VIDEO_ID"
  allowfullscreen
  loading="lazy"
  title="Describe the video"
></iframe>
```

Then update the `<p class="video-caption">` below with the correct caption.

---

### Swap audio tracks

Replace the files in `Music/` with new MP3s (keep the same filenames), or update the `src` in the `<audio>` tags and the `data-src` on each `.track-card`:

```html
<article class="track-card" data-src="Music/your-new-track.mp3">
  <div class="track-info">
    <span class="track-title">New Track Name</span>
    <span class="track-note">your description here</span>
  </div>
  ...
  <audio preload="metadata">
    <source src="Music/your-new-track.mp3" type="audio/mpeg">
  </audio>
</article>
```

---

### Update streaming links

In `index.html`, find `.stream-links` and update the `href` attributes:

```html
<a href="https://your-bandcamp-url" class="stream-btn" ...>Bandcamp</a>
<a href="https://your-spotify-url" class="stream-btn" ...>Spotify</a>
```

---

### Change the accent color

Open `styles.css` and change the `--accent` variable at the top:

```css
:root {
  --accent: #D4E642; /* hazard yellow — change this */
}
```

---

## Deploy to Netlify

### First deploy

1. Go to [netlify.com](https://netlify.com) and log in
2. Click **Add new site → Deploy manually**
3. Drag the entire `the-bugs-epk/` folder onto the drop zone
4. Done — Netlify gives you a URL immediately

### After making changes

**Option A — drag and drop again** (simplest):  
Go to your site in Netlify → Deploys → drag the folder again.

**Option B — connect to GitHub** (auto-deploys on push):
1. Push this folder to a GitHub repo
2. In Netlify: Site settings → Link to Git → select the repo
3. Build command: *(leave blank)*  
   Publish directory: `.` (the root)
4. Every `git push` to main will trigger a new deploy automatically

### Custom domain

In Netlify: Site settings → Domain management → Add custom domain → enter `iamabug.lol`  
Then update your DNS registrar to point to Netlify's nameservers (Netlify shows you the exact records).

---

## File structure

```
the-bugs-epk/
├── index.html          ← the whole site
├── styles.css          ← all styling
├── splat.svg           ← bug splat shape (yellow blob)
├── js/
│   ├── main.js         ← loads on page, imports audio + bugs
│   ├── audio.js        ← custom HTML5 audio player logic
│   └── bugs.js         ← swooping bug animation + splat mechanic
├── Graphics/           ← wordmark PNGs, bug head PNGs
├── Photos/             ← all photos
├── Music/              ← MP3 files
└── Video/              ← drop video files here when ready
```

---

## Bug animation notes

- Bugs respect `prefers-reduced-motion` — users who request no animations won't see them
- Bugs stop spawning when the **For Bookers** section is on screen
- Max 2 bugs on screen at once; they respawn every 3–5 seconds
- Splats persist until the page is refreshed or the 🪰 reset button is clicked
- The squish sound uses the Web Audio API — no audio file needed, generated in-browser
