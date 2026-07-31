'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SummaryTab } from './summary-tab';
import { TranscriptTab } from './transcript-tab';
import { ActionItemsTab } from './action-items-tab';
import { DecisionsTab } from './decisions-tab';
import { ChatTab } from './chat-tab';

interface MeetingTabsProps {
  meetingId: string;
  /** Controlled active tab so the page can switch to Transcript from a chat citation. */
  value: string;
  onValueChange: (value: string) => void;
  /** Pending transcript seek target set by chat citations. */
  seekIndex: number | null;
  onSeekConsumed: () => void;
  onCitationClick: (segmentIndex: number) => void;
}

/**
 * Tabbed meeting detail. Controlled tabs let a chat citation jump the user to the
 * Transcript tab and seek the audio to the cited segment.
 */
export function MeetingTabs({
  meetingId,
  value,
  onValueChange,
  seekIndex,
  onSeekConsumed,
  onCitationClick,
}: MeetingTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList className="flex w-full flex-wrap justify-start">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="transcript">Transcript</TabsTrigger>
        <TabsTrigger value="action-items">Action Items</TabsTrigger>
        <TabsTrigger value="decisions">Decisions</TabsTrigger>
        <TabsTrigger value="chat">Chat</TabsTrigger>
      </TabsList>
      <TabsContent value="summary">
        <SummaryTab meetingId={meetingId} />
      </TabsContent>
      <TabsContent value="transcript">
        <TranscriptTab
          meetingId={meetingId}
          seekIndex={seekIndex}
          onSeekConsumed={onSeekConsumed}
        />
      </TabsContent>
      <TabsContent value="action-items">
        <ActionItemsTab meetingId={meetingId} />
      </TabsContent>
      <TabsContent value="decisions">
        <DecisionsTab meetingId={meetingId} />
      </TabsContent>
      <TabsContent value="chat">
        <ChatTab meetingId={meetingId} onCitationClick={onCitationClick} />
      </TabsContent>
    </Tabs>
  );
}
