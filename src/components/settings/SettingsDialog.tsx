import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ProviderSettings } from './ProviderSettings';

export function SettingsDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="p-1 rounded hover:bg-accent transition-colors"
        title="設定"
        render={<button />}
      >
        <Settings size={12} className="text-muted-foreground" />
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 flex flex-col" showCloseButton={false}>
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">設定</SheetTitle>
          </div>
        </SheetHeader>
        <Tabs defaultValue="providers" className="flex-1 flex flex-col">
          <TabsList
            variant="line"
            className="w-full justify-start rounded-none border-b border-border bg-transparent h-9 px-4"
          >
            <TabsTrigger
              value="providers"
              className="text-xs rounded-none"
            >
              プロバイダー
            </TabsTrigger>
            <TabsTrigger
              value="styles"
              className="text-xs rounded-none"
            >
              スタイル
            </TabsTrigger>
            <TabsTrigger
              value="general"
              className="text-xs rounded-none"
            >
              全般
            </TabsTrigger>
          </TabsList>
          <TabsContent value="providers" className="flex-1 overflow-y-auto m-0 p-4">
            <ProviderSettings />
          </TabsContent>
          <TabsContent value="styles" className="flex-1 overflow-y-auto m-0 p-4">
            {/* Plan 06 で StyleManager を配置 */}
            <div className="text-xs text-muted-foreground">スタイル設定は準備中...</div>
          </TabsContent>
          <TabsContent value="general" className="flex-1 overflow-y-auto m-0 p-4">
            {/* Plan 06 で HistorySettings を配置 */}
            <div className="text-xs text-muted-foreground">全般設定は準備中...</div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
