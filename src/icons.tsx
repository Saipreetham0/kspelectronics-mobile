import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// The app's icons, drawn with MaterialCommunityIcons (ships with Expo). Same names and `weight` prop as before:
// 'fill' and 'duotone' draw the solid icon, anything else the outline one.
type Name = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type Props = { size?: number; color?: string; weight?: 'fill' | 'duotone' | 'regular' | 'bold' };
export type Icon = React.ComponentType<Props>;

const icon = (solid: Name, outline: Name = solid): Icon =>
  function Glyph({ size = 24, color, weight }: Props) {
    return <MaterialCommunityIcons name={weight === 'fill' || weight === 'duotone' ? solid : outline} size={size} color={color} />;
  };

export const ArrowLeft = icon('arrow-left');
export const Bank = icon('bank', 'bank-outline');
export const Bell = icon('bell', 'bell-outline');
export const CalendarCheck = icon('calendar-check', 'calendar-check-outline');
export const CaretDown = icon('chevron-down');
export const CaretRight = icon('chevron-right');
export const ClockCounterClockwise = icon('history');
export const Cpu = icon('chip');
export const CreditCard = icon('credit-card', 'credit-card-outline');
export const Export = icon('export-variant');
export const Headset = icon('headset');
export const Heart = icon('heart', 'heart-outline');
export const House = icon('home', 'home-outline');
export const Info = icon('information', 'information-outline');
export const Lightning = icon('lightning-bolt', 'lightning-bolt-outline');
export const LockSimple = icon('lock', 'lock-outline');
export const MagnifyingGlass = icon('magnify');
export const MapPin = icon('map-marker', 'map-marker-outline');
export const MapTrifold = icon('map', 'map-outline');
export const Minus = icon('minus');
export const Money = icon('cash');
export const Moped = icon('moped', 'moped-outline');
export const Package = icon('package-variant-closed', 'package-variant');
export const Plus = icon('plus');
export const Printer = icon('printer-3d');
export const QrCode = icon('qrcode');
export const SealPercent = icon('percent-circle', 'percent-circle-outline');
export const ShareNetwork = icon('share-variant', 'share-variant-outline');
export const SignOut = icon('logout');
export const SquaresFour = icon('view-grid', 'view-grid-outline');
export const Star = icon('star', 'star-outline');
export const Tag = icon('tag', 'tag-outline');
export const Truck = icon('truck', 'truck-outline');
export const User = icon('account', 'account-outline');
export const UserCircle = icon('account-circle', 'account-circle-outline');
export const WhatsappLogo = icon('whatsapp');
export const X = icon('close');
