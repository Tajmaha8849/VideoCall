# VoiceCall Meet - Video Calling with Voice Translation

A Google Meet-like video calling application with real-time voice-to-voice translation capabilities.

## Features

- **Video & Audio Calling**: WebRTC-based peer-to-peer video and audio communication
- **Room System**: Create or join rooms using unique codes
- **Voice Translation**: Real-time voice-to-voice translation between participants
- **Multi-language Support**: Support for 12+ languages including English, Spanish, French, German, etc.
- **Professional UI**: Clean, modern interface inspired by Google Meet
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Socket.IO client for real-time communication
- SimpleWebRTC for peer-to-peer connections
- Web Speech API for speech recognition and synthesis

### Backend
- Node.js with Express
- Socket.IO for WebSocket communication
- Room management and WebRTC signaling

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and setup the project:**
```bash
# The project is already set up in your current directory
```

2. **Install frontend dependencies:**
```bash
npm install
```

3. **Install backend dependencies:**
```bash
cd server
npm install
cd ..
```

### Running the Application

1. **Start the backend server:**
```bash
cd server
npm start
```
The server will run on `http://localhost:3001`

2. **Start the frontend development server:**
```bash
npm run dev
```
The frontend will run on `http://localhost:5173`

### Usage

1. **Create or Join a Room:**
   - Enter your name
   - Click "Create New Room" to generate a room code
   - Or enter an existing room code and click "Join Room"

2. **Video Call Features:**
   - Toggle microphone on/off
   - Toggle camera on/off
   - End call
   - Access voice translation settings

3. **Voice Translation:**
   - Click the settings icon during a call
   - Enable voice translation
   - Select your preferred language
   - Click the microphone to start/stop voice translation

## Voice Translation Flow

1. **Speech Recognition**: User's speech is converted to text using Web Speech API
2. **Translation**: Text is translated using translation service (MyMemory API as fallback)
3. **Text-to-Speech**: Translated text is converted back to speech
4. **Broadcast**: Translated audio is sent to other participants

## Deployment

### Frontend (Vercel/Netlify)

1. **Build the project:**
```bash
npm run build
```

2. **Deploy to Vercel:**
```bash
npm install -g vercel
vercel --prod
```

3. **Deploy to Netlify:**
- Connect your GitHub repository to Netlify
- Set build command: `npm run build`
- Set publish directory: `dist`

### Backend (Railway/Render)

1. **Create a `package.json` in server directory** (already created)

2. **Deploy to Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli
# Login and deploy
railway login
railway deploy
```

3. **Deploy to Render:**
- Connect your GitHub repository
- Set build command: `cd server && npm install`
- Set start command: `cd server && npm start`

## Environment Variables

### Frontend (.env)
```env
VITE_SERVER_URL=http://localhost:3001
# For production, set to your backend URL
```

### Backend (.env)
```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
# For production, set to your frontend URL
```

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support  
- **Safari**: Limited Web Speech API support
- **Mobile browsers**: Video calling supported, voice translation may be limited

## Limitations & Future Improvements

### Current Limitations
- Uses MyMemory API for translation (rate limited)
- Voice translation quality depends on browser's Speech API
- Maximum 4 participants per room

### Future Improvements
- Integrate Google Cloud Translation API
- Add screen sharing
- Implement chat messaging
- Add recording functionality
- Support for larger rooms
- Better mobile optimization

## Troubleshooting

### Common Issues

1. **Camera/Microphone not working:**
   - Ensure browser permissions are granted
   - Check if other applications are using the camera/mic

2. **Voice translation not working:**
   - Ensure microphone permissions are granted
   - Check browser support for Web Speech API
   - Try using Chrome for best compatibility

3. **Connection issues:**
   - Check if backend server is running
   - Verify CORS settings in production
   - Check network connectivity

## License

MIT License - feel free to use for personal and commercial projects.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

**Note**: This application uses WebRTC for peer-to-peer connections and Web APIs for voice processing. For production use, consider implementing STUN/TURN servers for better connectivity and enterprise-grade translation services for higher quality translations.