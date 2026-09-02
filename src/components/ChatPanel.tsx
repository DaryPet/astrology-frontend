import React from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownContent from './MarkdownContent';
import { isNearLimit, isAtLimit, MAX_MESSAGES, type ChatMessage } from '../services/chatStorage';
import type { StreamPhase } from '../hooks/useStreamedText';

interface ChatPanelProps {
  // Unique per instance — the open button's scroll-into-view targets
  // `#${sectionId} .db-chat`, so two panels on the same page can't share one id.
  sectionId: string;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  history: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  loading: boolean;
  phase: StreamPhase;
  displayedText: string;
  // Disables the open button until there's something to chat about —
  // mirrors the natal tab's `disabled={!fullAnalysis}`.
  openDisabled?: boolean;
}

// Extracted from Dashboard.tsx's inline natal-chat JSX so the same chat UI
// (message list, input, send button, limit warning) can be reused for the
// progressions and progressed-synastry chats without copy-pasting it twice
// more — see openspec/changes/add-progressions-chat/design.md.
const ChatPanel: React.FC<ChatPanelProps> = ({
  sectionId,
  visible,
  onVisibleChange,
  history,
  input,
  onInputChange,
  onSend,
  loading,
  phase,
  displayedText,
  openDisabled,
}) => {
  const { t } = useTranslation();

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div id={sectionId}>
      {!visible && (
        <div className="db-chat__open-row">
          <button
            onClick={() => {
              onVisibleChange(true);
              // Expanding this button in place doesn't move the page — with
              // existing history the panel can render taller than the
              // viewport, leaving the last message (what the user came back
              // to read) below the fold. Scroll it into view once the panel
              // has rendered. A brand-new chat (no history yet) has nothing
              // below the fold to reveal, so leave that case as-is.
              if (history.length > 0) {
                setTimeout(() => {
                  document.querySelector(`#${sectionId} .db-chat`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
              }
            }}
            className="db-btn-primary"
            style={{ maxWidth: '300px', width: '100%' }}
            disabled={openDisabled}
          >
            {history.length > 0 ? t('dashboard.chat.open') : t('dashboard.chat.start')}
          </button>
        </div>
      )}

      {visible && (
        <div className="db-chat">
          <h3 className="db-chat__header">{t('dashboard.chat.title')}</h3>
          <div className="db-chat__history">
            {history.map((message, index) => (
              <div
                key={index}
                className={`db-chat__bubble ${message.role === 'user' ? 'db-chat__bubble--user' : 'db-chat__bubble--ai'}`}
              >
                <span className={`db-chat__bubble-role ${message.role === 'user' ? 'db-chat__bubble-role--user' : 'db-chat__bubble-role--ai'}`}>
                  {message.role === 'user' ? t('dashboard.chat.user') : t('dashboard.chat.assistant')}
                </span>
                <div className="db-chat__bubble-body chat-message-content">
                  <MarkdownContent content={message.content} />
                </div>
              </div>
            ))}
            {loading && phase === 'typing' && (
              <div className="db-chat__bubble db-chat__bubble--ai">
                <span className="db-chat__bubble-role db-chat__bubble-role--ai">
                  {t('dashboard.chat.assistant')}
                </span>
                <div className="db-chat__bubble-body chat-message-content">
                  <MarkdownContent content={displayedText} />
                  <span className="typing-cursor" aria-hidden="true">▍</span>
                </div>
              </div>
            )}
          </div>
          <div className="db-chat__input-area">
            {isNearLimit(history) && (
              <div className={`db-chat__limit-warning ${isAtLimit(history) ? 'db-chat__limit-warning--reached' : 'db-chat__limit-warning--near'}`}>
                {isAtLimit(history) ? t('dashboard.chat.limitReached', { limit: MAX_MESSAGES }) : t('dashboard.chat.messagesLeft', { count: MAX_MESSAGES - history.length })}
              </div>
            )}
            <textarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) => { const textarea = e.target; textarea.style.height = 'auto'; textarea.style.height = textarea.scrollHeight + 'px'; }}
              placeholder={t('dashboard.chat.placeholder')}
              maxLength={200}
              disabled={loading}
              className="db-chat__input"
            />
            <button
              onClick={onSend}
              disabled={!input.trim() || loading || isAtLimit(history)}
              className="db-chat__send-btn"
            >
              {loading ? t('dashboard.chat.sending') : t('dashboard.chat.send')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPanel;
