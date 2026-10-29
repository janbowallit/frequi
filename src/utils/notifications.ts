import { t } from '@/i18n';
import type { FTWsMessage } from '@/types/wsMessageTypes';
import { FtWsMessageTypes } from '@/types/wsMessageTypes';

export function showNotification(msg: FTWsMessage, botname: string) {
  const settingsStore = useSettingsStore();
  if (settingsStore.notifications && settingsStore.notifications[msg.type]) {
    switch (msg.type) {
      case FtWsMessageTypes.entryFill:
        console.log('entryFill', msg);
        showAlert(
          t('alerts.entryFill', { pair: msg.pair, direction: msg.direction, rate: msg.open_rate }),
          'success',
          botname,
        );
        break;
      case FtWsMessageTypes.exitFill:
        console.log('exitFill', msg);
        showAlert(
          t('alerts.exitFill', { pair: msg.pair, direction: msg.direction, rate: msg.open_rate }),
          'success',
          botname,
        );
        break;
      case FtWsMessageTypes.exitCancel:
        console.log('exitCancel', msg);
        showAlert(
          t('alerts.exitCancel', { pair: msg.pair, reason: msg.reason }),
          'warning',
          botname,
        );
        break;
      case FtWsMessageTypes.entryCancel:
        console.log('entryCancel', msg);
        showAlert(
          t('alerts.entryCancel', { pair: msg.pair, reason: msg.reason }),
          'warning',
          botname,
        );
        break;
    }
  } else {
    console.log(`${botname}: Message ${msg.type} not shown.`);
  }
}
