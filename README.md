# 📸 PicPick

**Upload photos, share a link — friends pick their favorites and leave suggestions.**

PicPick is a lightweight, no-signup photo feedback tool. Create an album, share a link, and let friends vote on their favorite photos and leave suggestions — all from the browser.

## ✨ Features

- **Drag & Drop Upload** — Add photos by dragging or tapping. Auto-compressed to keep things fast.
- **Shareable Links** — One-click copy/share. Friends can vote and leave suggestions instantly.
- **Voting & Suggestions** — Reviewers tap to select favorites and leave per-photo text feedback.
- **Live Results** — See vote counts, rankings, and suggestions in real-time.
- **Export Results** — Download a full text summary of all votes and feedback.
- **My Albums** — View and manage all your created albums from the home screen.
- **No Account Needed** — No sign-up, no login. Works entirely in the browser.
- **Mobile Friendly** — Responsive design with touch gestures, lightbox, and native share support.

## 🛠️ Tech Stack

- **React 18** + **TypeScript**
- **Vite** — Lightning fast dev server & build
- **Tailwind CSS v4** — Utility-first styling
- **Framer Motion** — Smooth animations
- **Radix UI** — Accessible component primitives
- **Sonner** — Toast notifications
- **localStorage** — Client-side data persistence (no backend required)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/nayakpradhuman/Picpick.git
cd Picpick

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

## 📱 How It Works

1. **Create** — Enter an album title and upload your photos
2. **Share** — Copy the generated link and send it to friends
3. **Review** — Friends open the link, tap their favorite photos, and leave suggestions
4. **Results** — View vote rankings, suggestions, and per-reviewer breakdowns

## ⚠️ Limitations

- Data is stored in **localStorage** — works only on the same browser/device
- Sharing across devices requires a backend (e.g., Supabase, Firebase)
- Storage is limited to ~5MB depending on the browser

## 📄 License

This project is open source and available under the [MIT License](LICENSE).