import './style.css'

// Add simple reload functionality for the app iframe
declare global {
  interface Window {
    reloadFrame: () => void;
  }
}

window.reloadFrame = () => {
  const iframe = document.getElementById('app-frame') as HTMLIFrameElement;
  if (iframe) {
    iframe.src = iframe.src;
  }
}

// Add a slight entrance animation to the phone
const phone = document.querySelector('.marvel-device') as HTMLElement;
if (phone) {
  phone.style.opacity = '0';
  phone.style.transform = 'scale(0.8) translateY(20px)';
  phone.style.transition = 'all 1s cubic-bezier(0.16, 1, 0.3, 1)';
  
  setTimeout(() => {
    phone.style.opacity = '1';
    phone.style.transform = 'scale(0.85) translateY(0) rotateX(2deg) rotateY(-5deg)';
  }, 100);
}
