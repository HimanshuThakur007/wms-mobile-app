import { DeviceEventEmitter, EmitterSubscription, Platform } from 'react-native';

/**
 * Hardware Barcode Scanner Utility for Industrial Handheld Devices
 * (Zebra TC21/TC26/TC52/TC57, Honeywell EDA51/EDA52, Datalogic)
 * 
 * Overview of Operation Modes:
 * ----------------------------
 * Mode 1: Keystroke / Wedge Mode (Default & Recommended)
 *   - The hardware scanner inputs decoded barcode characters directly into the focused TextInput
 *     inside <HardwareScanInputCard /> and sends an Enter key / onSubmitEditing event.
 *   - Allows scanning 50+ items/minute using the hardware side trigger button without opening the camera.
 * 
 * Mode 2: Broadcast Intent Mode (Zebra DataWedge / Honeywell Intent Output)
 *   - DataWedge can be configured to broadcast an Android Intent action (e.g. `com.market99.wmsapp.SCAN_ACTION`)
 *     with extra key `com.symbol.datawedge.data_string`.
 */

export interface HardwareScanEvent {
  barcode: string;
  source: 'keystroke' | 'intent';
  timestamp: number;
}

/**
 * Register a listener for Android Broadcast Intents emitted by Zebra DataWedge or Honeywell Scanners.
 * 
 * @param onScan Callback function triggered when a barcode intent broadcast is received.
 * @returns EmitterSubscription clean-up handle.
 */
export function registerHardwareScannerListener(
  onScan: (scan: HardwareScanEvent) => void
): EmitterSubscription | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    const subscription = DeviceEventEmitter.addListener(
      'com.market99.wmsapp.SCAN_ACTION',
      (intentData: any) => {
        const rawBarcode =
          intentData?.['com.symbol.datawedge.data_string'] ||
          intentData?.barcode ||
          intentData?.data ||
          '';

        const barcode = String(rawBarcode).replace(/[\r\n\t]+/g, '').trim();
        if (barcode) {
          onScan({
            barcode,
            source: 'intent',
            timestamp: Date.now(),
          });
        }
      }
    );

    return subscription;
  } catch (err) {
    console.log('HARDWARE SCANNER INTENT LISTENER ERROR:', err);
    return null;
  }
}
