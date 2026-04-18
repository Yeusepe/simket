import { PluginCommonModule, VendurePlugin, Logger } from '@vendure/core';
import type { OnApplicationBootstrap } from '@nestjs/common';

const loggerCtx = 'SettlementPlugin';

@VendurePlugin({
  imports: [PluginCommonModule],
})
export class SettlementPlugin implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    Logger.info('SettlementPlugin initialized — collaboration revenue splitting ready', loggerCtx);
  }
}
