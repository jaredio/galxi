import fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { env } from './env';

const prisma = new PrismaClient();
const app = fastify({ logger: true });

app.register(cors, { origin: env.corsOrigin });

app.get('/health', async () => ({ status: 'ok' }));

app.get('/workspaces', async () => {
  return prisma.workspace.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
});

app.get('/users/:id/workspaces', async (request, reply) => {
  const { id } = request.params as { id: string };
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    reply.code(404);
    return { error: 'User not found' };
  }
  return prisma.workspace.findMany({
    where: { ownerId: id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
});

app.post('/users', async (request, reply) => {
  const body = (request.body as { name?: string }) ?? {};
  const name = body.name?.trim() || 'User';
  const user = await prisma.user.create({
    data: { name },
    select: { id: true, name: true, createdAt: true },
  });
  reply.code(201);
  return user;
});

app.get('/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, createdAt: true },
  });
  if (!user) {
    reply.code(404);
    return { error: 'User not found' };
  }
  return user;
});

app.post('/users/:id/workspaces', async (request, reply) => {
  const { id } = request.params as { id: string };
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    reply.code(404);
    return { error: 'User not found' };
  }
  const body = (request.body as { name?: string }) ?? {};
  const name = body.name?.trim() || 'Untitled Workspace';

  const workspace = await prisma.workspace.create({
    data: { name, ownerId: id },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  reply.code(201);
  return workspace;
});

app.get('/workspaces/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: { nodes: true, groups: true, links: true },
  });

  if (!workspace) {
    reply.code(404);
    return { error: 'Workspace not found' };
  }

  return workspace;
});

type IncomingNode = {
  id: string;
  type: string;
  label: string;
  x?: number;
  y?: number;
  groupId?: string | null;
  profile?: unknown;
};

type IncomingGroup = {
  id: string;
  type: string;
  title: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  profile?: unknown;
};

type IncomingLink = {
  id: string;
  sourceId: string;
  targetId: string;
  relation?: string | null;
};

type WorkspacePayload = {
  name?: string;
  nodes?: IncomingNode[];
  groups?: IncomingGroup[];
  links?: IncomingLink[];
};

app.put('/workspaces/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { name, nodes = [], groups = [], links = [] } = (request.body as WorkspacePayload) ?? {};

  const existing = await prisma.workspace.findUnique({ where: { id } });
  if (!existing) {
    reply.code(404);
    return { error: 'Workspace not found' };
  }

  await prisma.$transaction(async (tx) => {
    if (name?.trim()) {
      await tx.workspace.update({ where: { id }, data: { name: name.trim() } });
    }

    await tx.link.deleteMany({ where: { workspaceId: id } });
    await tx.node.deleteMany({ where: { workspaceId: id } });
    await tx.group.deleteMany({ where: { workspaceId: id } });

    if (groups.length) {
      await tx.group.createMany({
        data: groups.map((group) => ({
          id: group.id,
          workspaceId: id,
          type: group.type,
          title: group.title,
          x: group.x ?? 0,
          y: group.y ?? 0,
          width: group.width ?? 320,
          height: group.height ?? 240,
          profile: group.profile ?? null,
        })),
      });
    }

    if (nodes.length) {
      await tx.node.createMany({
        data: nodes.map((node) => ({
          id: node.id,
          workspaceId: id,
          type: node.type,
          label: node.label,
          x: node.x ?? 0,
          y: node.y ?? 0,
          profile: node.profile ?? null,
          groupId: node.groupId ?? null,
        })),
      });
    }

    if (links.length) {
      await tx.link.createMany({
        data: links.map((link) => ({
          id: link.id,
          workspaceId: id,
          sourceId: link.sourceId,
          targetId: link.targetId,
          relation: link.relation ?? null,
        })),
      });
    }
  });

  return { ok: true };
});

app.delete('/workspaces/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const existing = await prisma.workspace.findUnique({ where: { id } });
  if (!existing) {
    reply.code(404);
    return { error: 'Workspace not found' };
  }
  await prisma.workspace.delete({ where: { id } });
  reply.code(204);
  return null;
});

const start = async () => {
  try {
    await app.listen({ port: env.port, host: '0.0.0.0' });
    app.log.info(`API listening on http://0.0.0.0:${env.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
