import React, { forwardRef, useRef, useCallback, useImperativeHandle, useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import type { GlobalOptions as ConfettiGlobalOptions, CreateTypes as ConfettiInstance, Options as ConfettiOptions } from "canvas-confetti";

type Api = { fire: (options?: ConfettiOptions) => void };
export type ConfettiRef = Api | null;

const ConfettiCanvas = forwardRef<ConfettiRef, React.ComponentPropsWithRef<"canvas"> & { options?: ConfettiOptions; globalOptions?: ConfettiGlobalOptions; manualstart?: boolean }>((props, ref) => {
    const { options, globalOptions = { resize: true, useWorker: true }, manualstart = false, ...rest } = props;
    const instanceRef = useRef<ConfettiInstance | null>(null);

    const canvasRef = useCallback((node: HTMLCanvasElement) => {
        if (node !== null) {
            if (instanceRef.current) return;
            instanceRef.current = confetti.create(node, { ...globalOptions, resize: true });
        } else {
            if (instanceRef.current) {
                instanceRef.current.reset();
                instanceRef.current = null;
            }
        }
    }, [globalOptions]);

    const fire = useCallback((opts = {}) => instanceRef.current?.({ ...options, ...opts }), [options]);
    const api = useMemo(() => ({ fire }), [fire]);
    useImperativeHandle(ref, () => api, [api]);
    useEffect(() => { if (!manualstart) fire(); }, [manualstart, fire]);

    return <canvas ref={canvasRef} {...rest} />;
});

ConfettiCanvas.displayName = "ConfettiCanvas";

export default ConfettiCanvas;

