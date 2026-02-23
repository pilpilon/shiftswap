import { useEffect, useState } from 'react';
import { initializePaddle, type Paddle } from '@paddle/paddle-js';

// Replace with your real client token from Paddle Sandbox or Production
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || 'test_token_change_me';
const PADDLE_ENVIRONMENT = import.meta.env.VITE_PADDLE_ENV || 'sandbox'; // 'sandbox' or 'production'

export function usePaddle() {
    const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        initializePaddle({
            environment: PADDLE_ENVIRONMENT as 'sandbox' | 'production',
            token: PADDLE_CLIENT_TOKEN
        }).then((paddleInstance: Paddle | undefined) => {
            if (paddleInstance) {
                setPaddle(paddleInstance);
                setIsInitialized(true);
            }
        });
    }, []);

    const openCheckout = (priceId: string, customerEmail?: string) => {
        if (!paddle) {
            console.error('Paddle SDK not initialized yet.');
            return;
        }

        paddle.Checkout.open({
            items: [
                {
                    priceId: priceId,
                    quantity: 1,
                },
            ],
            customer: customerEmail ? { email: customerEmail } : undefined,
        });
    };

    return { paddle, isInitialized, openCheckout };
}
