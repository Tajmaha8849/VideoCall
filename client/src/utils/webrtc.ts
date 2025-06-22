import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';

export class WebRTCManager {
  private socket: Socket;
  private localStream: MediaStream | null = null;
  private peers: Map<string, Peer.Instance> = new Map();
  public onRemoteStream?: (userId: string, stream: MediaStream) => void;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  async initializeMedia(videoElement: HTMLVideoElement) {
    try {
      // Request both video and audio with specific constraints
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 2
        }
      });

      videoElement.srcObject = this.localStream;
      
      // Ensure video plays
      videoElement.onloadedmetadata = () => {
        videoElement.play().catch(console.error);
      };

      // Log audio tracks for debugging
      const audioTracks = this.localStream.getAudioTracks();
      const videoTracks = this.localStream.getVideoTracks();
      
      console.log('Local media initialized successfully');
      console.log('Audio tracks:', audioTracks.length, audioTracks.map(t => t.label));
      console.log('Video tracks:', videoTracks.length, videoTracks.map(t => t.label));
      
      // Ensure audio is enabled
      audioTracks.forEach(track => {
        track.enabled = true;
        console.log('Audio track enabled:', track.label, track.enabled);
      });

    } catch (error) {
      console.error('Failed to get media:', error);
      
      // Try fallback with lower quality
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true
        });
        videoElement.srcObject = this.localStream;
        console.log('Fallback media initialized');
      } catch (fallbackError) {
        console.error('Fallback media failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  createPeerConnection(userId: string, initiator: boolean) {
    if (this.peers.has(userId)) {
      console.log('Peer connection already exists for:', userId);
      return;
    }

    if (!this.localStream) {
      console.error('No local stream available for peer connection');
      return;
    }

    console.log(`Creating peer connection for ${userId}, initiator: ${initiator}`);

    const peer = new Peer({
      initiator,
      trickle: false,
      stream: this.localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      },
      // Enable audio and video
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      },
      answerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      }
    });

    peer.on('signal', (data) => {
      console.log(`Sending ${data.type} to ${userId}`);
      if (data.type === 'offer') {
        this.socket.emit('offer', {
          offer: data,
          target: userId
        });
      } else if (data.type === 'answer') {
        this.socket.emit('answer', {
          answer: data,
          target: userId
        });
      }
    });

    peer.on('stream', (stream) => {
      console.log('Received remote stream from:', userId);
      
      // Log received stream details
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      console.log(`Remote stream - Audio: ${audioTracks.length}, Video: ${videoTracks.length}`);
      
      // Ensure audio tracks are enabled
      audioTracks.forEach(track => {
        track.enabled = true;
        console.log('Remote audio track enabled:', track.label, track.enabled);
      });

      if (this.onRemoteStream) {
        this.onRemoteStream(userId, stream);
      }
    });

    peer.on('connect', () => {
      console.log('Peer connected:', userId);
    });

    peer.on('data', (data) => {
      console.log('Received data from peer:', userId, data);
    });

    peer.on('error', (error) => {
      console.error('Peer error for', userId, ':', error);
      // Don't immediately delete, try to recover
      setTimeout(() => {
        if (this.peers.has(userId)) {
          console.log('Attempting to recreate peer connection for:', userId);
          this.peers.delete(userId);
          this.createPeerConnection(userId, initiator);
        }
      }, 2000);
    });

    peer.on('close', () => {
      console.log('Peer connection closed:', userId);
      this.peers.delete(userId);
    });

    this.peers.set(userId, peer);
  }

  async handleOffer(offer: any, callerId: string) {
    console.log('Handling offer from:', callerId);
    this.createPeerConnection(callerId, false);
    const peer = this.peers.get(callerId);
    if (peer) {
      try {
        peer.signal(offer);
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    }
  }

  async handleAnswer(answer: any, answererId: string) {
    console.log('Handling answer from:', answererId);
    const peer = this.peers.get(answererId);
    if (peer) {
      try {
        peer.signal(answer);
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  }

  handleIceCandidate(candidate: any, senderId: string) {
    const peer = this.peers.get(senderId);
    if (peer) {
      try {
        peer.signal(candidate);
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    }
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log('Audio toggled:', audioTrack.enabled);
        return !audioTrack.enabled; // Return muted state
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log('Video toggled:', videoTrack.enabled);
        return !videoTrack.enabled; // Return video off state
      }
    }
    return false;
  }

  // Get current audio/video state
  getAudioState() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      return audioTrack ? audioTrack.enabled : false;
    }
    return false;
  }

  getVideoState() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      return videoTrack ? videoTrack.enabled : false;
    }
    return false;
  }

  removePeerConnection(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      console.log('Removing peer connection for:', userId);
      peer.destroy();
      this.peers.delete(userId);
    }
  }

  cleanup() {
    console.log('Cleaning up WebRTC connections');
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      this.localStream = null;
    }

    // Close all peer connections
    this.peers.forEach((peer, userId) => {
      console.log('Destroying peer connection for:', userId);
      peer.destroy();
    });
    this.peers.clear();
  }
}