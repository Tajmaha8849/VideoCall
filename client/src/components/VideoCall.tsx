import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, Settings, Users } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { UserData } from '../App';
import { VoiceTranslation } from './VoiceTranslation';
import { WebRTCManager } from '../utils/webrtc';

interface VideoCallProps {
  userData: UserData;
  onEndCall: () => void;
}

interface Participant {
  id: string;
  name: string;
  isHost: boolean;
}

export const VideoCall: React.FC<VideoCallProps> = ({ userData, onEndCall }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [webrtcManager, setWebrtcManager] = useState<WebRTCManager | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement }>({});
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const manager = new WebRTCManager(socket);
    setWebrtcManager(manager);

    // Initialize local media with error handling
    const initMedia = async () => {
      try {
        setConnectionStatus('Getting camera and microphone...');
        await manager.initializeMedia(localVideoRef.current!);
        setConnectionStatus('Media ready');
      } catch (error) {
        console.error('Media initialization failed:', error);
        setConnectionStatus('Media access failed - check permissions');
      }
    };

    initMedia();

    // Socket event listeners
    socket.on('room-created', (data) => {
      console.log('Room created, users:', data.users);
      setParticipants(data.users || []);
      setConnectionStatus('Room created - waiting for participants');
    });

    socket.on('room-joined', (data) => {
      console.log('Room joined, users:', data.users);
      setParticipants(data.users || []);
      setConnectionStatus('Joined room - connecting to participants');
      
      // Create peer connections for existing users (excluding self)
      data.users.forEach((user: Participant) => {
        if (user.id !== socket.id) {
          console.log('Creating peer connection for existing user:', user.name);
          setTimeout(() => {
            manager.createPeerConnection(user.id, true);
          }, 1000); // Small delay to ensure media is ready
        }
      });
    });

    socket.on('user-joined', (data) => {
      console.log('New user joined:', data.user.name, 'Total users:', data.users);
      setParticipants(data.users);
      setConnectionStatus('New participant joined - establishing connection');
      
      // Create peer connection for new user (existing users initiate)
      if (data.user.id !== socket.id) {
        console.log('Creating peer connection for new user:', data.user.name);
        setTimeout(() => {
          manager.createPeerConnection(data.user.id, true);
        }, 1000);
      }
    });

    socket.on('user-left', (data) => {
      console.log('User left, remaining users:', data.users);
      setParticipants(data.users);
      manager.removePeerConnection(data.userId);
      setConnectionStatus('Participant left');
    });

    socket.on('offer', async (data) => {
      console.log('Received offer from:', data.caller);
      setConnectionStatus('Receiving call...');
      await manager.handleOffer(data.offer, data.caller);
    });

    socket.on('answer', async (data) => {
      console.log('Received answer from:', data.answerer);
      setConnectionStatus('Call answered - establishing connection');
      await manager.handleAnswer(data.answer, data.answerer);
    });

    socket.on('ice-candidate', (data) => {
      manager.handleIceCandidate(data.candidate, data.sender);
    });

    // Set remote video callback
    manager.onRemoteStream = (userId: string, stream: MediaStream) => {
      console.log('Setting remote stream for user:', userId);
      setConnectionStatus('Connected to participant');
      
      const videoElement = remoteVideosRef.current[userId];
      if (videoElement) {
        videoElement.srcObject = stream;
        
        // Ensure audio is not muted on remote video elements
        videoElement.muted = false;
        videoElement.volume = 1.0;
        
        videoElement.onloadedmetadata = () => {
          videoElement.play().catch(error => {
            console.error('Error playing remote video:', error);
            // Try to play with user interaction
            videoElement.onclick = () => {
              videoElement.play().catch(console.error);
            };
          });
        };
      }
    };

    return () => {
      manager.cleanup();
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [socket]);

  const toggleMute = () => {
    if (webrtcManager) {
      const newMutedState = webrtcManager.toggleMute();
      setIsMuted(newMutedState);
    }
  };

  const toggleVideo = () => {
    if (webrtcManager) {
      const newVideoOffState = webrtcManager.toggleVideo();
      setIsVideoOff(newVideoOffState);
    }
  };

  const handleEndCall = () => {
    if (webrtcManager) {
      webrtcManager.cleanup();
    }
    onEndCall();
  };

  // Find current user in participants list
  const currentUser = participants.find(p => p.id === socket?.id);
  const otherParticipants = participants.filter(p => p.id !== socket?.id);

  console.log('Current participants:', participants);
  console.log('Current user:', currentUser);
  console.log('Other participants:', otherParticipants);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Room {userData.roomCode}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{connectionStatus}</span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-2xl overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
              {userData.name} (You)
              {userData.isHost && ' 👑'}
            </div>
            {/* Mute indicator */}
            {isMuted && (
              <div className="absolute top-4 left-4 bg-red-600 text-white p-2 rounded-full">
                <MicOff className="w-4 h-4" />
              </div>
            )}
            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-semibold">
                    {userData.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {otherParticipants.map((participant) => (
            <div key={participant.id} className="relative bg-gray-800 rounded-2xl overflow-hidden">
              <video
                ref={(el) => {
                  if (el) {
                    remoteVideosRef.current[participant.id] = el;
                    // Ensure audio is enabled for remote videos
                    el.muted = false;
                    el.volume = 1.0;
                  }
                }}
                autoPlay
                playsInline
                muted={false} // Important: Don't mute remote videos
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
                {participant.name}
                {participant.isHost && ' 👑'}
              </div>
              {/* Placeholder when no video stream */}
              <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-semibold">
                    {participant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Empty slots for additional participants */}
          {Array.from({ length: Math.max(0, 4 - participants.length) }).map((_, index) => (
            <div key={`empty-${index}`} className="relative bg-gray-800 rounded-2xl overflow-hidden opacity-50">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-500 text-center">
                  <Users className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">Waiting for participant...</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white px-6 py-4 flex items-center justify-center gap-4">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-colors ${
            isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-colors ${
            isVideoOff ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>

        <button
          onClick={handleEndCall}
          className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
          title="End call"
        >
          <Phone className="w-6 h-6 rotate-[135deg]" />
        </button>
      </div>

      {/* Voice Translation Panel */}
      {showSettings && (
        <VoiceTranslation onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};