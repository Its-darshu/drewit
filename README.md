# SketchBoard 🎨

A collaborative drawing application built with React, TypeScript, and Firebase. Create, edit, and share sketches in real-time with a hand-drawn aesthetic powered by RoughJS.

## ✨ Features

- **Hand-drawn aesthetic** with RoughJS rendering
- **Google Authentication** via Firebase Auth
- **User Dashboard** with board management
- **Real-time collaboration** (coming soon)
- **Multiple drawing tools**: Rectangle, Line, Circle, Pencil, Text
- **Canvas controls**: Undo/Redo, Pan, Zoom
- **High-DPI support** for crisp rendering
- **Responsive design** with Tailwind CSS

## 🚀 Quick Start

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd drewit
   npm install
   ```

2. **Firebase Setup**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication with Google provider
   - Enable Firestore Database
   - Copy your Firebase config

3. **Environment Configuration**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env with your Firebase configuration
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Run the application**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in with Google!

## 🔧 Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🏗️ Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (CDN)
- **Drawing**: RoughJS for sketch-style rendering
- **Routing**: React Router DOM
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **State**: Custom hooks with useReducer

## 📁 Project Structure

```
├── components/          # React components
│   ├── LoginPage.tsx   # Google sign-in page
│   ├── Dashboard.tsx   # User dashboard with boards
│   └── DrawingCanvas.tsx # Main drawing interface
├── hooks/              # Custom React hooks
│   ├── useAuth.ts      # Authentication state
│   └── useHistory.ts   # Undo/redo functionality
├── services/           # Business logic
│   ├── firebase.ts     # Firebase configuration
│   └── drawingService.ts # Drawing utilities
└── types.ts           # TypeScript definitions
```

## 🔐 Authentication Flow

1. **Landing** → Redirect to login if not authenticated
2. **Login Page** → Google OAuth sign-in
3. **Dashboard** → Board management and creation
4. **Canvas** → Drawing interface with tools

## 🎯 Roadmap

- [x] Google Authentication
- [x] User Dashboard
- [x] Drawing Canvas
- [ ] Board Persistence
- [ ] Real-time Collaboration
- [ ] Board Sharing
- [ ] Export Options
- [ ] Mobile Support

## 🔧 Tech Stack

- **React 19** - Latest React with concurrent features
- **TypeScript** - Type safety and better DX
- **Vite** - Fast build tool and dev server
- **Firebase** - Authentication and database
- **RoughJS** - Hand-drawn style graphics
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing

## 📝 License

MIT License - feel free to use this project for learning or as a starting point for your own applications!
- Text editing textarea now positions better and font is applied.


