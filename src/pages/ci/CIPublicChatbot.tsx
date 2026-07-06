import { OpsAssistChatbot } from '@/components/ci/OpsAssistChatbot';

export default function CIPublicChatbot() {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-blue-900 mb-4">Chatbot Ops Assist</h2>
      <OpsAssistChatbot channel="chatbot" />
    </div>
  );
}
