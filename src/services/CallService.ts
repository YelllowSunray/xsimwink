import { db } from '@/lib/firebase';
import { addDoc, collection, doc, onSnapshot, query, updateDoc, where, serverTimestamp, arrayUnion } from 'firebase/firestore';

export interface CallParticipant {
  id: string;
  name: string;
}

export interface CallInvite {
  id: string;
  roomId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  status: 'ringing' | 'accepted' | 'ended';
  createdAt: Date;
  updatedAt: Date;
  // Group call fields
  isGroupCall?: boolean;
  participants?: CallParticipant[];
  acceptedParticipants?: string[];
}

export class CallService {
  // Original 1-on-1 call (kept for backward compatibility)
  static async createCall(params: { callerId: string; callerName: string; calleeId: string; calleeName: string; }): Promise<{ callId: string; roomId: string; }> {
    const roomId = [params.callerId, params.calleeId].sort().join('_');
    const ref = await addDoc(collection(db, 'calls'), {
      roomId,
      callerId: params.callerId,
      callerName: params.callerName,
      calleeId: params.calleeId,
      calleeName: params.calleeName,
      status: 'ringing',
      isGroupCall: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { callId: ref.id, roomId };
  }

  // New group call method
  static async createGroupCall(params: {
    callerId: string;
    callerName: string;
    participants: CallParticipant[]; // All participants including invitees
  }): Promise<{ roomId: string; callIds: string[] }> {
    const timestamp = Date.now();
    const roomId = `group_${params.callerId}_${timestamp}`;
    
    // Create individual call invites for each participant
    const callIds: string[] = [];
    
    for (const participant of params.participants) {
      if (participant.id === params.callerId) continue; // Skip the caller
      
      const ref = await addDoc(collection(db, 'calls'), {
        roomId,
        callerId: params.callerId,
        callerName: params.callerName,
        calleeId: participant.id,
        calleeName: participant.name,
        status: 'ringing',
        isGroupCall: true,
        participants: params.participants,
        acceptedParticipants: [params.callerId], // Caller is already in
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      callIds.push(ref.id);
    }
    
    return { roomId, callIds };
  }

  static listenIncoming(userId: string, callback: (invite: CallInvite) => void): () => void {
    const q = query(collection(db, 'calls'), where('calleeId', '==', userId), where('status', '==', 'ringing'));
    return onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as any;
          callback({
            id: change.doc.id,
            roomId: data.roomId,
            callerId: data.callerId,
            callerName: data.callerName,
            calleeId: data.calleeId,
            calleeName: data.calleeName,
            status: data.status,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            isGroupCall: data.isGroupCall || false,
            participants: data.participants || [],
            acceptedParticipants: data.acceptedParticipants || [],
          });
        }
      });
    });
  }

  static async acceptCall(callId: string): Promise<void> {
    const ref = doc(db, 'calls', callId);
    await updateDoc(ref, { status: 'accepted', updatedAt: serverTimestamp() });
  }

  static async endCall(callId: string): Promise<void> {
    const ref = doc(db, 'calls', callId);
    await updateDoc(ref, { status: 'ended', updatedAt: serverTimestamp() });
  }

  // Listen for when a specific call is accepted or ended
  static listenForCallAcceptance(callerId: string, calleeId: string, callback: (accepted: boolean) => void): () => void {
    const roomId = [callerId, calleeId].sort().join('_');
    const q = query(
      collection(db, 'calls'), 
      where('roomId', '==', roomId),
      where('callerId', '==', callerId)
    );
    
    return onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          if (data.status === 'accepted') {
            callback(true);
          } else if (data.status === 'ended') {
            callback(false);
          }
        }
      });
    });
  }
}
