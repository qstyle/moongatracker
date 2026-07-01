import { useRoute } from 'wouter';
import { ReactFlowProvider } from '@xyflow/react';
import { FlowCanvas } from '../components/canvas/flow-canvas';

export function CanvasPage() {
  const [, params] = useRoute('/projects/:projectId/canvas');
  const projectId = params?.projectId ?? '';

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Проект не выбран
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <FlowCanvas projectId={projectId} />
      </ReactFlowProvider>
    </div>
  );
}
