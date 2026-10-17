import numpy as np, sounddevice as sd, time
SR=48000
def buzz(ch, n):
    out=[]
    for _ in range(n):
        t=np.arange(int(SR*0.35))/SR
        env=np.minimum(1,t/0.01)*np.minimum(1,(0.35-t)/0.02)
        sig=(0.85*np.sin(2*np.pi*170*t)*env).astype(np.float32)
        blk=np.zeros((len(t),4),np.float32); blk[:,ch]=sig
        out+= [blk, np.zeros((int(SR*0.3),4),np.float32)]
    out.append(np.zeros((int(SR*1.5),4),np.float32))
    return np.concatenate(out)
order=[(2,1),(3,2),(0,3),(1,4)]   # (channel index, buzz count)
audio=np.concatenate([buzz(c,n) for c,n in order]*2)
sd.play(audio, SR, device=16, blocking=True)
print('done')
