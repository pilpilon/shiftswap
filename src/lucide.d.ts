import { SVGProps } from 'react';

declare module 'lucide-react' {
    export interface LucideProps extends SVGProps<SVGSVGElement> {
        size?: string | number;
        absoluteStrokeWidth?: boolean;
    }
    export type Icon = React.ForwardRefExoticComponent<LucideProps>;
    export const Calendar: Icon;
    export const Users: Icon;
    export const MessageSquareText: Icon;
    export const Settings: Icon;
    export const LogOut: Icon;
    export const Bell: Icon;
    export const Plus: Icon;
    export const CheckCircle2: Icon;
    export const CalendarClock: Icon;
    export const MessageCircle: Icon;
    export const Zap: Icon;
    export const ShieldCheck: Icon;
    export const ArrowLeft: Icon;
}
