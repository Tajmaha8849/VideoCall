import React, { useState, useEffect } from 'react';
import { Video, Users, Plus, LogIn, Loader } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { UserData } from '../App';

interface HomeScreenProps {
  onJoinCall: (data: UserData) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onJoinCall }) => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('room-created', (data) => {
      setLoading(false);
      onJoinCall({
        name,
        roomCode: data.roomCode,
        isHost: data.isHost
      });
    });

    socket.on('room-joined', (data) => {
      setLoading(false);
      onJoinCall({
        name,
        roomCode: data.roomCode,
        isHost: data.isHost
      });
    });

    socket.on('error', (data) => {
      setLoading(false);
      setError(data.message);
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('error');
    };
  }, [socket, name, onJoinCall]);

  const handleCreateRoom = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }

    setError('');
    setLoading(true);
    socket.emit('create-room', { name: name.trim() });
  };

  const handleJoinRoom = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!roomCode.trim()) {
      setError('Please enter room code');
      return;
    }

    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }

    setError('');
    setLoading(true);
    socket.emit('join-room', { 
      name: name.trim(), 
      roomCode: roomCode.trim().toUpperCase() 
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            VoiceCall Meet
          </h1>
          <p className="text-gray-600">
            Video calls with real-time voice translation
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="space-y-6">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                disabled={loading}
              />
            </div>

            {/* Create Room Button */}
            <button
              onClick={handleCreateRoom}
              disabled={loading || !connected}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              Create New Room
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Join Room */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors uppercase"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={loading || !connected}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              Join Room
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Connection Status */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-600">
              {connected ? 'Connected to server' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-center">
          <div className="p-4">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Group Video Calls</p>
          </div>
          <div className="p-4">
            <Video className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Voice Translation</p>
          </div>
        </div>
      </div>
    </div>
  );
};