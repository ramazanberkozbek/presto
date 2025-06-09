# Tempo - Pomodoro Timer

A modern, cross-platform Pomodoro timer application built with Tauri (Rust + HTML/CSS/JavaScript). Tempo helps you boost productivity using the proven Pomodoro Technique with a beautiful, intuitive interface.

## ✨ Features

### 🍅 Pomodoro Technique
- **Standard Pomodoro cycles**: 25-minute work sessions
- **Smart breaks**: 5-minute short breaks, 20-minute long breaks every 4 cycles
- **Daily goal**: Track progress through 10 daily Pomodoro sessions
- **Visual progress**: Dot indicators showing session completion

### ⏱️ Timer Management
- **Flexible controls**: Start, pause, reset, and skip functionality
- **Visual feedback**: Dynamic UI that changes based on session type (work/break)
- **Audio notifications**: Sound alerts for session transitions
- **Desktop notifications**: System notifications to keep you informed

### 📋 Task Management
- **Task tracking**: Add and manage tasks for each Pomodoro session
- **Task completion**: Mark tasks as completed with visual feedback
- **Persistence**: Tasks are automatically saved and restored

### 📊 Statistics & History
- **Weekly statistics**: Track your productivity patterns
- **Session history**: View detailed history of completed sessions
- **Progress tracking**: Monitor your daily and weekly Pomodoro completion

### ⌨️ Keyboard Shortcuts
- **Space**: Start/Pause timer
- **Cmd/Ctrl + R**: Reset current session
- **Cmd/Ctrl + S**: Skip current session
- **Cmd/Ctrl + H**: Show/hide history modal

### 🎨 Modern UI
- **Dark mode design**: Easy on the eyes for long work sessions
- **Responsive layout**: Works on different screen sizes
- **Smooth animations**: Polished user experience
- **Protection**: Prevents accidental closure during active sessions

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Rust](https://rustup.rs/) (latest stable)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tempo.git
   cd tempo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri dev
   ```

4. **Build for production**
   ```bash
   npm run tauri build
   ```

## 🏗️ Project Structure

```
tempo/
├── src/                    # Frontend source files
│   ├── index.html         # Main HTML interface
│   ├── styles.css         # CSS styles and animations
│   └── main.js           # JavaScript application logic
├── src-tauri/             # Rust backend
│   ├── src/
│   │   └── lib.rs        # Tauri commands and data persistence
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # Tauri configuration
├── package.json          # Node.js dependencies and scripts
└── README.md            # This file
```

## 🔧 Technical Details

### Frontend (HTML/CSS/JavaScript)
- **Pure vanilla JavaScript**: No frameworks, lightweight and fast
- **CSS Grid & Flexbox**: Modern responsive layouts
- **CSS Custom Properties**: Consistent theming and easy customization
- **Local Storage**: Client-side data persistence

### Backend (Rust/Tauri)
- **Tauri framework**: Secure, fast native app wrapper
- **File-based storage**: JSON files for data persistence
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Small bundle size**: Efficient Rust backend

### Data Persistence
The application stores data in the following locations:
- **Session data**: Current timer state and progress
- **Tasks**: User-created task list
- **Statistics**: Daily and weekly productivity stats
- **History**: Historical session data

## 🎯 The Pomodoro Technique

The Pomodoro Technique is a time management method developed by Francesco Cirillo:

1. **Choose a task** to work on
2. **Set timer for 25 minutes** (one "Pomodoro")
3. **Work on the task** until timer rings
4. **Take a 5-minute break**
5. **Repeat steps 1-4**
6. **After 4 Pomodoros**, take a longer 20-minute break

### Benefits
- Improved focus and concentration
- Better time estimation skills
- Reduced mental fatigue
- Enhanced productivity
- Better work-life balance

## 🛠️ Development

### Available Scripts
- `npm run tauri dev` - Start development server
- `npm run tauri build` - Build production app
- `cargo check` - Check Rust code (in src-tauri/)
- `cargo test` - Run Rust tests (in src-tauri/)

### Recommended IDE Setup
- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 📱 Platform Support

- **Windows** (7, 8, 10, 11)
- **macOS** (10.13+)
- **Linux** (Ubuntu 18.04+, and other distributions)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Francesco Cirillo](https://francescocirillo.com/) for creating the Pomodoro Technique
- [Tauri](https://tauri.app/) for the amazing framework
- The Rust and web development communities

---

**Start your productive journey with Tempo!** 🍅✨
