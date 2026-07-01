import { ForbiddenException } from '@nestjs/common';
import { MEMBER_COLOR_PALETTE, pickNextMemberColor } from '@moongatracker/shared-types';
import { ProjectsService } from './projects.service';

const NOW = new Date('2025-01-01T00:00:00.000Z');

describe('member colors', () => {
  describe('pickNextMemberColor', () => {
    it('returns the first palette color when none are used', () => {
      expect(pickNextMemberColor([])).toBe(MEMBER_COLOR_PALETTE[0]);
    });

    it('returns the first unused palette color', () => {
      const used = [MEMBER_COLOR_PALETTE[0], MEMBER_COLOR_PALETTE[1]];
      expect(pickNextMemberColor(used)).toBe(MEMBER_COLOR_PALETTE[2]);
    });

    it('cycles when every palette color is taken', () => {
      const used = [...MEMBER_COLOR_PALETTE];
      expect(pickNextMemberColor(used)).toBe(MEMBER_COLOR_PALETTE[0]);
    });
  });

  describe('addMember auto-assigns color', () => {
    it('uses the next free palette color for the new membership', async () => {
      let createdColor: string | undefined;
      const fakePrisma = {
        membership: {
          findUnique: async () => ({ id: 'caller-m' }), // assertMembership + existing check
          findMany: async () => [{ color: MEMBER_COLOR_PALETTE[0] }],
          create: async ({ data }: { data: { color: string } }) => {
            createdColor = data.color;
            return {
              userId: 'u2',
              color: data.color,
              createdAt: NOW,
              user: { username: 'bob', name: null },
            };
          },
        },
        user: {
          findUnique: async () => ({ id: 'u2', username: 'bob', name: null }),
        },
      } as any;

      const service = new ProjectsService(fakePrisma);
      // membership.findUnique is used both by assertMembership (truthy) and the
      // existing-member check; make the second call return null via a counter.
      let calls = 0;
      fakePrisma.membership.findUnique = async () => {
        calls += 1;
        return calls === 1 ? { id: 'caller-m' } : null;
      };

      const result = await service.addMember('p1', 'bob', 'caller');
      expect(createdColor).toBe(MEMBER_COLOR_PALETTE[1]);
      expect(result.color).toBe(MEMBER_COLOR_PALETTE[1]);
    });
  });

  describe('updateMemberColor owner gate', () => {
    function makePrisma(ownerId: string | null) {
      return {
        membership: {
          findUnique: async () => ({ id: 'caller-m' }),
          updateMany: async () => ({ count: 1 }),
        },
        project: {
          findUnique: async () => ({ ownerId }),
        },
      } as any;
    }

    it('rejects when caller is not the owner', async () => {
      const service = new ProjectsService(makePrisma('someone-else'));
      await expect(
        service.updateMemberColor('p1', 'u2', '#123456', 'caller'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows the owner to change a color', async () => {
      const prisma = makePrisma('caller');
      prisma.membership.findUnique = async () => ({
        userId: 'u2',
        color: '#123456',
        createdAt: NOW,
        user: { username: 'bob', name: null },
      });
      const service = new ProjectsService(prisma);
      const result = await service.updateMemberColor(
        'p1',
        'u2',
        '#123456',
        'caller',
      );
      expect(result.color).toBe('#123456');
    });
  });
});
