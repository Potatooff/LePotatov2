# LePotato v2 🥔

A modern, responsive AI chat interface built with Next.js 14, React, and Tailwind CSS.

## Features

- 🎨 Clean, modern UI with light/dark mode support
- 📱 Responsive design with collapsible sidebar
- 💬 Real-time chat interface with markdown support
- 🔄 Multiple AI model support
- 📜 Chat history management
- ⚡ Performance optimized with infinite scroll
- 🎯 Keyboard shortcuts and accessibility features

## Tech Stack

- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI primitives
- **Font:** Geist (Variable)
- **State Management:** React Context
- **Animations:** CSS transitions

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/PotatoOff/LePotatov2.git
```

2. Install dependencies:
```bash
cd LePotatov2
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
LePotatov2/
├── app/                   # Next.js app router
├── components/           
│   ├── ui/               # Reusable UI components
│   ├── chat-box.tsx      # Message input component
│   ├── chat-messages.tsx # Messages display
│   └── ...              # Other components
├── lib/                  # Utility functions
└── public/              # Static assets
```

## Key Features

- **Smart Layout:** Collapsible sidebar with persistent state
- **Message Threading:** Organized conversation view
- **Model Selection:** Support for multiple AI models
- **Responsive Design:** Mobile-first approach
- **Theme Support:** Light/dark mode with system preference detection
- **Accessibility:** ARIA-compliant components

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.
