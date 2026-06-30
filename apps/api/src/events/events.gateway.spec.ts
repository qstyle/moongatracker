import { EventsGateway } from './events.gateway';

function client(id: string) {
  return { id, join: jest.fn(), emit: jest.fn() } as any;
}

describe('EventsGateway canvas lock', () => {
  it('acquire даёт лок свободного холста, повторный от другого — отказ', () => {
    const gw = new EventsGateway();
    gw.server = { to: () => ({ emit: jest.fn() }) } as any;
    const a = client('sock-a');
    const r1 = gw.canvasAcquire(a, { projectId: 'p1', userId: 'u1', name: 'A', color: '#f00' });
    expect(r1.ok).toBe(true);
    const b = client('sock-b');
    const r2 = gw.canvasAcquire(b, { projectId: 'p1', userId: 'u2', name: 'B', color: '#0f0' });
    expect(r2.ok).toBe(false);
    expect(r2.holder?.userId).toBe('u1');
  });

  it('release освобождает, после чего другой может взять', () => {
    const gw = new EventsGateway();
    gw.server = { to: () => ({ emit: jest.fn() }) } as any;
    const a = client('sock-a');
    gw.canvasAcquire(a, { projectId: 'p1', userId: 'u1', name: 'A', color: '#f00' });
    gw.canvasRelease(a, { projectId: 'p1' });
    const b = client('sock-b');
    expect(gw.canvasAcquire(b, { projectId: 'p1', userId: 'u2', name: 'B', color: '#0f0' }).ok).toBe(true);
  });

  it('disconnect снимает лок этого сокета', () => {
    const gw = new EventsGateway();
    gw.server = { to: () => ({ emit: jest.fn() }) } as any;
    const a = client('sock-a');
    gw.canvasAcquire(a, { projectId: 'p1', userId: 'u1', name: 'A', color: '#f00' });
    gw.handleDisconnect(a);
    const b = client('sock-b');
    expect(gw.canvasAcquire(b, { projectId: 'p1', userId: 'u2', name: 'B', color: '#0f0' }).ok).toBe(true);
  });
});
