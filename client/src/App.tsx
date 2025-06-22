import React, { useState, useEffect } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { VideoCall } from './components/VideoCall';
import { SocketProvider } from './contexts/SocketContext';

export type AppState = 'home' | 'call';

export interface UserData {
  name: string;
  roomCode: string;
  isHost: boolean;
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppState>('home');
  const [userData, setUserData] = useState<UserData | null>(null);

  const handleJoinCall = (data: UserData) => {
    setUserData(data);
    setCurrentScreen('call');
  };

  const handleEndCall = () => {
    setUserData(null);
    setCurrentScreen('home');
  };

  return (
    <SocketProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {currentScreen === 'home' && (
          <HomeScreen onJoinCall={handleJoinCall} />
        )}
        {currentScreen === 'call' && userData && (
          <VideoCall 
            userData={userData} 
            onEndCall={handleEndCall} 
          />
        )}
      </div>
    </SocketProvider>
  );
}

export default App;