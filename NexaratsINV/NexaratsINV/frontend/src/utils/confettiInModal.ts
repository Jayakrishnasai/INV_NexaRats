import confetti from 'canvas-confetti';

/**
 * Fires confetti that renders ABOVE modals (z-index 10001).
 * canvas-confetti creates its own canvas by default at z=10000.
 * This wraps it with a canvas that sits above the settings modal.
 */
let modalCanvas: HTMLCanvasElement | null = null;
let modalConfetti: confetti.CreateTypes | null = null;

function getModalConfetti(): confetti.CreateTypes {
    if (!modalCanvas || !document.body.contains(modalCanvas)) {
        modalCanvas = document.createElement('canvas');
        modalCanvas.style.position = 'fixed';
        modalCanvas.style.inset = '0';
        modalCanvas.style.width = '100vw';
        modalCanvas.style.height = '100vh';
        modalCanvas.style.zIndex = '10001';
        modalCanvas.style.pointerEvents = 'none';
        document.body.appendChild(modalCanvas);
        modalConfetti = confetti.create(modalCanvas, { resize: true, useWorker: true });
    }
    return modalConfetti!;
}

export function fireConfetti(options: confetti.Options = {}) {
    const fire = getModalConfetti();
    fire({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0284C7', '#10B981', '#38BDF8'],
        ...options,
    });
}
