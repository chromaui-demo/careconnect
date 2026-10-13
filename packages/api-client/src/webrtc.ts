import { api } from './index.js';

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function createWebRTCCall(appointmentId: string, role: 'patient' | 'provider') {
  const pc = new RTCPeerConnection(STUN);
  let lastSignalId = '';
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let localStream: MediaStream | null = null;

  const sendSignal = (signalType: string, payload: unknown) =>
    api.sendTelemedSignal(appointmentId, role, signalType, payload);

  const pollSignals = async () => {
    const signals = await api.getTelemedSignals(appointmentId, lastSignalId || undefined);
    for (const sig of signals) {
      if (sig.fromRole === role) continue;
      lastSignalId = sig.id;
      if (sig.signalType === 'offer') {
        await pc.setRemoteDescription(sig.payload as RTCSessionDescriptionInit);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal('answer', answer);
      } else if (sig.signalType === 'answer') {
        await pc.setRemoteDescription(sig.payload as RTCSessionDescriptionInit);
      } else if (sig.signalType === 'ice') {
        await pc.addIceCandidate(sig.payload as RTCIceCandidateInit);
      }
    }
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) sendSignal('ice', e.candidate.toJSON());
  };

  const start = async (onRemoteStream: (stream: MediaStream) => void) => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream!));
    pc.ontrack = (e) => onRemoteStream(e.streams[0]);

    pollTimer = setInterval(pollSignals, 1500);

    if (role === 'provider') {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal('offer', offer);
    }
  };

  const stop = () => {
    if (pollTimer) clearInterval(pollTimer);
    localStream?.getTracks().forEach((t) => t.stop());
    pc.close();
  };

  return { pc, start, stop, getLocalStream: () => localStream };
}
