type PublicUser = {
  id: number;
  username: string;
  fullName: string;
  role: 'admin' | 'warehouse_manager' | 'viewer';
};

type OfflineState = {
  version: 2;
  nextId: number;
  currentUserId: number | null;
  nodeIdentity: {
    nodeId: string;
    installationId: string;
    nodeType: 'android' | 'windows';
    keyId: string | null;
    originSequence: number;
    createdAt: string;
  };
  entityIds: Array<{ entityType: string; localId: number; globalId: string; createdAt: string }>;
  changeLog: Array<Record<string, unknown>>;
  outbox: Array<Record<string, unknown>>;
  inbox: Array<Record<string, unknown>>;
  syncCursors: Array<Record<string, unknown>>;
  conflictQueue: Array<Record<string, unknown>>;
  tombstones: Array<Record<string, unknown>>;
  users: Array<PublicUser & { passwordHash: string; passwordSalt: string; isActive: boolean; createdAt: string }>;
  settings: {
    id: number;
    setupCompleted: boolean;
    setupAt: string | null;
    orgName: string;
    orgSubtitle: string | null;
    expiryAlertDays: number;
    unitsList: string | null;
    updatedAt: string;
  };
  categories: Array<{ id: number; name: string; type: string; createdAt: string }>;
  items: Array<Record<string, unknown>>;
  equipment: Array<Record<string, unknown>>;
  recipients: Array<Record<string, unknown>>;
  exitReasons: Array<Record<string, unknown>>;
  transactions: Array<Record<string, unknown>>;
  alerts: Array<Record<string, unknown>>;
  auditLog: Array<Record<string, unknown>>;
};

const DB_NAME = 'damascus-emergency-inventory-offline';
const DB_VERSION = 2;
const STORE_NAME = 'state';
const STATE_KEY = 'current';
const OFFLINE_HEADER = 'X-Damascus-Offline';

let statePromise: Promise<OfflineState> | undefined;
let writeQueue = Promise.resolve();

function now() {
  return new Date().toISOString();
}

function publicUser(user: OfflineState['users'][number]): PublicUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  };
}

function initialState(): OfflineState {
  const timestamp = now();
  return {
    version: 2,
    nextId: 1,
    currentUserId: null,
    nodeIdentity: {
      nodeId: crypto.randomUUID(),
      installationId: crypto.randomUUID(),
      nodeType: 'android',
      keyId: null,
      originSequence: 0,
      createdAt: timestamp,
    },
    entityIds: [],
    changeLog: [],
    outbox: [],
    inbox: [],
    syncCursors: [],
    conflictQueue: [],
    tombstones: [],
    users: [],
    settings: {
      id: 1,
      setupCompleted: false,
      setupAt: null,
      orgName: 'مديرية الاحالة و الاسعاف و الطوارئ - دمشق',
      orgSubtitle: null,
      expiryAlertDays: 30,
      unitsList: null,
      updatedAt: timestamp,
    },
    categories: [
      { id: 1, name: 'مواد طبية', type: 'consumable', createdAt: timestamp },
      { id: 2, name: 'تجهيزات', type: 'equipment', createdAt: timestamp },
    ],
    items: [],
    equipment: [],
    recipients: [],
    exitReasons: [
      { id: 1, name: 'صرف اعتيادي', isSystem: true, isActive: true, createdAt: timestamp },
      { id: 2, name: 'تلف', isSystem: true, isActive: true, createdAt: timestamp },
      { id: 3, name: 'إرجاع مركزي', isSystem: true, isActive: true, createdAt: timestamp },
    ],
    transactions: [],
    alerts: [],
    auditLog: [],
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('تعذر فتح قاعدة البيانات المحلية'));
  });
}

async function loadState(): Promise<OfflineState> {
  const db = await openDatabase();
  const existing = await new Promise<OfflineState | undefined>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result as OfflineState | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (existing) {
    const fresh = initialState();
    return {
      ...fresh,
      ...existing,
      version: 2,
      nodeIdentity: existing.nodeIdentity ?? fresh.nodeIdentity,
      entityIds: existing.entityIds ?? [],
      changeLog: existing.changeLog ?? [],
      outbox: existing.outbox ?? [],
      inbox: existing.inbox ?? [],
      syncCursors: existing.syncCursors ?? [],
      conflictQueue: existing.conflictQueue ?? [],
      tombstones: existing.tombstones ?? [],
    };
  }
  const fresh = initialState();
  await saveState(fresh);
  return fresh;
}

async function saveState(state: OfflineState) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

function getState() {
  statePromise ??= loadState();
  return statePromise;
}

async function mutate<T>(callback: (state: OfflineState) => Promise<T> | T): Promise<T> {
  const run = writeQueue.then(async () => {
    const state = await getState();
    const result = await callback(state);
    await saveState(state);
    return result;
  });
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function read<T>(callback: (state: OfflineState) => T): Promise<T> {
  return callback(await getState());
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', [OFFLINE_HEADER]: '1', ...headers },
  });
}

function failure(status: number, error: string) {
  return json({ error }, status);
}

function idFrom(pathname: string, segment: string) {
  const match = pathname.match(new RegExp(`/${segment}/(\\d+)(?:/|$)`));
  return match ? Number(match[1]) : undefined;
}

function nextId(state: OfflineState) {
  const id = state.nextId;
  state.nextId += 1;
  return id;
}

function recordOfflineChange(
  state: OfflineState,
  entityType: string,
  localId: number | null,
  changeType: 'create' | 'update' | 'delete',
  payload: Record<string, unknown>,
) {
  const existing = localId == null
    ? undefined
    : state.entityIds.find((entry) => entry.entityType === entityType && entry.localId === localId);
  const globalId = existing?.globalId ?? crypto.randomUUID();
  if (!existing && localId != null) {
    state.entityIds.push({
      entityType,
      localId,
      globalId,
      createdAt: now(),
    });
  }

  state.nodeIdentity.originSequence += 1;
  const operationId = crypto.randomUUID();
  const changeId = crypto.randomUUID();
  const change = {
    changeId,
    operationId,
    entityType,
    entityGlobalId: globalId,
    localEntityId: localId,
    changeType,
    payload,
    originNodeId: state.nodeIdentity.nodeId,
    originSequence: state.nodeIdentity.originSequence,
    createdAt: now(),
    receivedAt: null,
    appliedAt: now(),
    status: 'local-pending',
    rejectionCode: null,
  };
  state.changeLog.push(change);
  state.outbox.push({
    changeId,
    status: 'pending',
    createdAt: change.createdAt,
    exportedAt: null,
    acknowledgedAt: null,
  });
  if (changeType === 'delete') {
    state.tombstones.push({
      entityType,
      entityGlobalId: globalId,
      deletedByChangeId: changeId,
      originNodeId: state.nodeIdentity.nodeId,
      createdAt: change.createdAt,
      propagated: false,
    });
  }
  return { changeId, operationId, globalId };
}

function readBody(init?: RequestInit) {
  const body = init?.body;
  if (!body || typeof body !== 'string') return {};
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getCurrentUser(state: OfflineState) {
  return state.users.find((user) => user.id === state.currentUserId && user.isActive);
}

function auth(state: OfflineState) {
  const user = getCurrentUser(state);
  return user ? publicUser(user) : null;
}

function roleAllowed(user: PublicUser, roles: PublicUser['role'][]) {
  return roles.includes(user.role);
}

async function passwordHash(password: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

function itemWithCategory(state: OfflineState, item: Record<string, unknown>): Record<string, unknown> {
  const category = state.categories.find((entry) => entry.id === item.categoryId);
  return { ...item, categoryName: category?.name ?? null };
}

function paged<T>(rows: T[], searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.max(1, Math.min(5000, Number(searchParams.get('limit') ?? 50)));
  const start = (page - 1) * limit;
  return { rows: rows.slice(start, start + limit), total: rows.length, page, limit };
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sortRows<T extends Record<string, unknown>>(rows: T[], key: string | null, direction: string | null) {
  if (!key) return rows;
  const sign = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'ar', {
    numeric: true,
  }) * sign);
}

function addAudit(state: OfflineState, user: PublicUser | null, action: string, entityType: string, entityId?: number) {
  state.auditLog.unshift({
    id: nextId(state),
    userId: user?.id ?? null,
    userNameSnap: user?.fullName ?? 'محلي',
    action,
    entityType,
    entityId: entityId ?? null,
    details: null,
    createdAt: now(),
  });
}

function itemFromInput(state: OfflineState, body: Record<string, unknown>, existing?: Record<string, unknown>) {
  const timestamp = now();
  return {
    ...(existing ?? {}),
    id: existing?.id ?? nextId(state),
    code: body.code ?? existing?.code ?? null,
    name: text(body.name, text(existing?.name)),
    categoryId: body.categoryId ?? existing?.categoryId ?? null,
    itemType: text(body.itemType, text(existing?.itemType, 'consumable')),
    unit: text(body.unit, text(existing?.unit, 'قطعة')),
    currentStock: numberValue(body.currentStock, numberValue(existing?.currentStock)),
    minStock: numberValue(body.minStock, numberValue(existing?.minStock)),
    expiryDate: body.expiryDate ?? existing?.expiryDate ?? null,
    batchNumber: body.batchNumber ?? existing?.batchNumber ?? null,
    location: body.location ?? existing?.location ?? null,
    supplier: body.supplier ?? existing?.supplier ?? null,
    notes: body.notes ?? existing?.notes ?? null,
    isActive: existing?.isActive ?? true,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

function equipmentFromInput(state: OfflineState, body: Record<string, unknown>, existing?: Record<string, unknown>) {
  const timestamp = now();
  return {
    ...(existing ?? {}),
    id: existing?.id ?? nextId(state),
    name: text(body.name, text(existing?.name)),
    equipmentType: body.equipmentType ?? existing?.equipmentType ?? null,
    model: body.model ?? existing?.model ?? null,
    serialNumber: body.serialNumber ?? existing?.serialNumber ?? null,
    condition: text(body.condition, text(existing?.condition, 'good')),
    manufactureYear: body.manufactureYear ?? existing?.manufactureYear ?? null,
    originCountry: body.originCountry ?? existing?.originCountry ?? null,
    currentHolder: body.currentHolder ?? existing?.currentHolder ?? null,
    notes: body.notes ?? existing?.notes ?? null,
    quantity: numberValue(body.quantity, numberValue(existing?.quantity, 1)),
    minQuantity: numberValue(body.minQuantity, numberValue(existing?.minQuantity)),
    maintenanceSentAt: body.maintenanceSentAt ?? existing?.maintenanceSentAt ?? null,
    maintenanceReturnedAt: body.maintenanceReturnedAt ?? existing?.maintenanceReturnedAt ?? null,
    maintenanceNotes: body.maintenanceNotes ?? existing?.maintenanceNotes ?? null,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

async function route(pathname: string, searchParams: URLSearchParams, method: string, init?: RequestInit): Promise<Response> {
  if (pathname === '/api/healthz' && method === 'GET') return json({ status: 'ok' });

  if (pathname === '/api/auth/setup-status' && method === 'GET') {
    return read((state) => json({ needsSetup: !state.users.some((user) => user.role === 'admin') }));
  }

  if (pathname === '/api/auth/setup' && method === 'POST') {
    const body = readBody(init);
    return mutate(async (state) => {
      if (state.users.some((user) => user.role === 'admin')) return failure(409, 'Admin already exists');
      const username = text(body.username);
      const fullName = text(body.fullName);
      const password = text(body.password);
      if (!username || !fullName || password.length < 8) return failure(400, 'username, password, and fullName are required');
      if (state.users.some((user) => user.username === username)) return failure(409, 'Username already taken');
      const salt = crypto.randomUUID();
      const user = {
        id: nextId(state),
        username,
        fullName,
        role: 'admin' as const,
        passwordHash: await passwordHash(password, salt),
        passwordSalt: salt,
        isActive: true,
        createdAt: now(),
      };
      state.users.push(user);
      state.currentUserId = user.id;
      state.settings.setupCompleted = true;
      state.settings.setupAt = now();
      addAudit(state, publicUser(user), 'create', 'user', user.id);
      return json(publicUser(user));
    });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = readBody(init);
    return mutate(async (state) => {
      const user = state.users.find((entry) => entry.username === text(body.username) && entry.isActive);
      if (!user || (await passwordHash(text(body.password), user.passwordSalt)) !== user.passwordHash) {
        return failure(401, 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
      state.currentUserId = user.id;
      return json(publicUser(user));
    });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    return mutate((state) => {
      state.currentUserId = null;
      return json({ ok: true });
    });
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    return read((state) => {
      const user = auth(state);
      return user ? json(user) : failure(401, 'Not authenticated');
    });
  }

  const currentUser = await read((state) => auth(state));
  if (!currentUser) return failure(401, 'Not authenticated');

  if (pathname === '/api/categories' && method === 'GET') {
    return read((state) => json(state.categories.map(({ id, name, type }) => ({ id, name, type }))));
  }
  if (pathname === '/api/categories' && method === 'POST') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const body = readBody(init);
      const name = text(body.name);
      const category = { id: nextId(state), name, type: text(body.type, 'consumable'), createdAt: now() };
      state.categories.push(category);
      recordOfflineChange(state, 'category', category.id, 'create', { name: category.name, type: category.type });
      addAudit(state, currentUser, 'create', 'category', category.id);
      return json(category);
    });
  }
  const categoryId = idFrom(pathname, 'categories');
  if (categoryId && pathname === `/api/categories/${categoryId}` && method === 'PUT') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const category = state.categories.find((entry) => entry.id === categoryId);
      if (!category) return failure(404, 'التصنيف غير موجود');
      const body = readBody(init);
      category.name = text(body.name, category.name);
      category.type = text(body.type, category.type);
      recordOfflineChange(state, 'category', category.id, 'update', { name: category.name, type: category.type });
      addAudit(state, currentUser, 'update', 'category', category.id);
      return json(category);
    });
  }
  if (categoryId && pathname === `/api/categories/${categoryId}` && method === 'DELETE') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      state.categories = state.categories.filter((entry) => entry.id !== categoryId);
      recordOfflineChange(state, 'category', categoryId, 'delete', {});
      addAudit(state, currentUser, 'delete', 'category', categoryId);
      return json({ ok: true });
    });
  }

  if (pathname === '/api/items' && method === 'GET') {
    return read((state) => {
      let rows = state.items.filter((item) => item.isActive !== false).map((item) => itemWithCategory(state, item));
      const search = text(searchParams.get('search'));
      if (search) rows = rows.filter((item) => `${item.name} ${item.code ?? ''}`.includes(search));
      if (searchParams.get('categoryId')) rows = rows.filter((item) => item.categoryId === Number(searchParams.get('categoryId')));
      if (searchParams.get('belowMin') === 'true') rows = rows.filter((item) => numberValue(item.currentStock) <= numberValue(item.minStock));
      return json(paged(sortRows(rows, searchParams.get('sortBy'), searchParams.get('sortDir')), searchParams));
    });
  }
  if (pathname === '/api/items' && method === 'POST') {
    if (!roleAllowed(currentUser, ['admin', 'warehouse_manager'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const item = itemFromInput(state, readBody(init));
      state.items.push(item);
      recordOfflineChange(state, 'item', Number(item.id), 'create', {
        name: item.name,
        itemType: item.itemType,
        quantity: item.currentStock,
      });
      addAudit(state, currentUser, 'create', 'item', Number(item.id));
      return json(item, 201);
    });
  }
  const itemId = idFrom(pathname, 'items');
  if (itemId && pathname === `/api/items/${itemId}` && method === 'GET') {
    return read((state) => {
      const item = state.items.find((entry) => entry.id === itemId && entry.isActive !== false);
      return item ? json(itemWithCategory(state, item)) : failure(404, 'المادة غير موجودة');
    });
  }
  if (itemId && pathname === `/api/items/${itemId}` && method === 'PUT') {
    if (!roleAllowed(currentUser, ['admin', 'warehouse_manager'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const index = state.items.findIndex((entry) => entry.id === itemId);
      if (index < 0) return failure(404, 'المادة غير موجودة');
      state.items[index] = itemFromInput(state, readBody(init), state.items[index]);
      addAudit(state, currentUser, 'update', 'item', itemId);
      return json(itemWithCategory(state, state.items[index]));
    });
  }
  if (itemId && pathname === `/api/items/${itemId}` && method === 'DELETE') {
    if (!roleAllowed(currentUser, ['admin', 'warehouse_manager'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) return failure(404, 'المادة غير موجودة');
      item.isActive = false;
      item.updatedAt = now();
      addAudit(state, currentUser, 'delete', 'item', itemId);
      return json({ ok: true });
    });
  }
  if (pathname === '/api/items/history' && method === 'GET') {
    const historyItemId = Number(searchParams.get('itemId'));
    return read((state) => json({
      item: state.items.find((item) => item.id === historyItemId) ?? null,
      movements: state.transactions.filter((transaction) => transaction.itemId === historyItemId),
      batches: [],
      allocations: [],
    }));
  }
  if (pathname === '/api/items/fefo-preview' && method === 'GET') {
    return read((state) => {
      const item = state.items.find((entry) => entry.id === Number(searchParams.get('itemId')));
      return json({ itemId: item?.id ?? null, requestedQuantity: Number(searchParams.get('quantity') ?? 0), allocations: [], expiredBatches: [] });
    });
  }
  if (pathname === '/api/items/bulk-import' && method === 'POST') {
    if (!roleAllowed(currentUser, ['admin', 'warehouse_manager'])) return failure(403, 'ليس لديك صلاحية');
    return json({ inserted: 0, updated: 0, skipped: 0, errors: [] });
  }

  if (pathname === '/api/equipment' && method === 'GET') {
    return read((state) => {
      let rows = [...state.equipment];
      const search = text(searchParams.get('search'));
      if (search) rows = rows.filter((item) => `${item.name} ${item.model ?? ''} ${item.serialNumber ?? ''}`.includes(search));
      if (searchParams.get('condition')) rows = rows.filter((item) => item.condition === searchParams.get('condition'));
      return json({ ...paged(sortRows(rows, searchParams.get('sortBy'), searchParams.get('sortDir')), searchParams), equipment: paged(sortRows(rows, searchParams.get('sortBy'), searchParams.get('sortDir')), searchParams).rows });
    });
  }
  if (pathname === '/api/equipment' && method === 'POST') {
    if (!roleAllowed(currentUser, ['admin', 'warehouse_manager'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const equipment = equipmentFromInput(state, readBody(init));
      state.equipment.push(equipment);
      recordOfflineChange(state, 'equipment', Number(equipment.id), 'create', {
        name: equipment.name,
        serialNumber: equipment.serialNumber,
        quantity: equipment.quantity,
      });
      addAudit(state, currentUser, 'create', 'equipment', Number(equipment.id));
      return json(equipment, 201);
    });
  }
  const equipmentId = idFrom(pathname, 'equipment');
  if (equipmentId && pathname === `/api/equipment/${equipmentId}` && method === 'GET') {
    return read((state) => {
      const equipment = state.equipment.find((entry) => entry.id === equipmentId);
      return equipment ? json(equipment) : failure(404, 'التجهيز غير موجود');
    });
  }
  if (equipmentId && pathname === `/api/equipment/${equipmentId}` && method === 'PUT') {
    if (!roleAllowed(currentUser, ['admin', 'warehouse_manager'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const index = state.equipment.findIndex((entry) => entry.id === equipmentId);
      if (index < 0) return failure(404, 'التجهيز غير موجود');
      state.equipment[index] = equipmentFromInput(state, readBody(init), state.equipment[index]);
      addAudit(state, currentUser, 'update', 'equipment', equipmentId);
      return json(state.equipment[index]);
    });
  }
  if (equipmentId && pathname === `/api/equipment/${equipmentId}` && method === 'DELETE') {
    if (!roleAllowed(currentUser, ['admin', 'warehouse_manager'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      state.equipment = state.equipment.filter((entry) => entry.id !== equipmentId);
      addAudit(state, currentUser, 'delete', 'equipment', equipmentId);
      return json({ ok: true });
    });
  }
  if (pathname === '/api/equipment/bulk-import' && method === 'POST') {
    if (!roleAllowed(currentUser, ['admin', 'warehouse_manager'])) return failure(403, 'ليس لديك صلاحية');
    return json({ inserted: 0, updated: 0, skipped: 0, errors: [] });
  }

  if (pathname === '/api/recipients' && method === 'GET') {
    return read((state) => json(state.recipients.filter((entry) => searchParams.get('includeInactive') === 'true' || entry.isActive !== false)));
  }
  if (pathname === '/api/recipients' && method === 'POST') {
    if (!roleAllowed(currentUser, ['admin', 'warehouse_manager'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const body = readBody(init);
      const recipient = { id: nextId(state), name: text(body.name), notes: body.notes ?? null, isActive: true, createdAt: now() };
      state.recipients.push(recipient);
      addAudit(state, currentUser, 'create', 'recipient', recipient.id);
      return json(recipient);
    });
  }
  const recipientId = idFrom(pathname, 'recipients');
  if (recipientId && pathname === `/api/recipients/${recipientId}` && method === 'PUT') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const recipient = state.recipients.find((entry) => entry.id === recipientId);
      if (!recipient) return failure(404, 'الجهة غير موجودة');
      const body = readBody(init);
      Object.assign(recipient, { name: text(body.name, text(recipient.name)), notes: body.notes ?? recipient.notes });
      return json(recipient);
    });
  }
  if (recipientId && pathname === `/api/recipients/${recipientId}/toggle` && method === 'PATCH') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const recipient = state.recipients.find((entry) => entry.id === recipientId);
      if (!recipient) return failure(404, 'الجهة غير موجودة');
      recipient.isActive = !recipient.isActive;
      return json(recipient);
    });
  }

  if (pathname === '/api/exit-reasons' && method === 'GET') {
    return read((state) => json(state.exitReasons.filter((entry) => searchParams.get('includeInactive') === 'true' || entry.isActive !== false)));
  }
  if (pathname === '/api/exit-reasons' && method === 'POST') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const body = readBody(init);
      const reason = { id: nextId(state), name: text(body.name), isSystem: false, isActive: true, createdAt: now() };
      state.exitReasons.push(reason);
      return json(reason);
    });
  }
  const reasonId = idFrom(pathname, 'exit-reasons');
  if (reasonId && pathname === `/api/exit-reasons/${reasonId}` && method === 'PUT') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const reason = state.exitReasons.find((entry) => entry.id === reasonId);
      if (!reason) return failure(404, 'سبب الإخراج غير موجود');
      reason.name = text(readBody(init).name, text(reason.name));
      return json(reason);
    });
  }
  if (reasonId && pathname === `/api/exit-reasons/${reasonId}/toggle` && method === 'PATCH') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const reason = state.exitReasons.find((entry) => entry.id === reasonId);
      if (!reason) return failure(404, 'سبب الإخراج غير موجود');
      if (reason.isSystem) return failure(400, 'لا يمكن تعطيل الأسباب الافتراضية للنظام');
      reason.isActive = !reason.isActive;
      return json(reason);
    });
  }

  if (pathname === '/api/transactions' && method === 'GET') {
    return read((state) => {
      let rows = [...state.transactions];
      const search = text(searchParams.get('search'));
      if (search) rows = rows.filter((transaction) => JSON.stringify(transaction).includes(search));
      if (searchParams.get('type') && searchParams.get('type') !== 'all') rows = rows.filter((transaction) => transaction.type === searchParams.get('type'));
      const page = paged(rows, searchParams);
      return json({ transactions: page.rows, total: page.total, page: page.page, limit: page.limit });
    });
  }
  if (pathname.startsWith('/api/transactions/') && method === 'POST') {
    if (!roleAllowed(currentUser, ['admin', 'warehouse_manager'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const body = readBody(init);
      const type = pathname.split('/').pop() ?? 'adjust';
      const transaction = {
        id: nextId(state),
        type,
        documentNumber: body.documentNumber ?? `OFF-${Date.now()}`,
        transactionDate: body.transactionDate ?? now().slice(0, 10),
        notes: body.notes ?? null,
        itemId: body.itemId ?? null,
        equipmentId: body.equipmentId ?? null,
        quantity: numberValue(body.quantity, 0),
        createdBy: currentUser.id,
        createdAt: now(),
        ...body,
      };
      const target = state.items.find((item) => item.id === Number(body.itemId));
      if (target && ['in', 'central-return', 'central_return'].includes(type)) target.currentStock = numberValue(target.currentStock) + numberValue(body.quantity);
      if (target && ['out', 'custody-out', 'custody_out', 'damage'].includes(type)) target.currentStock = Math.max(0, numberValue(target.currentStock) - numberValue(body.quantity));
      state.transactions.unshift(transaction);
      const transactionIdentity = recordOfflineChange(
        state,
        'transaction',
        Number(transaction.id),
        'create',
        {
          type: transaction.type,
          documentNumber: transaction.documentNumber,
          itemId: transaction.itemId,
          equipmentId: transaction.equipmentId,
          quantity: transaction.quantity,
        },
      );
      Object.assign(transaction, {
        operationId: transactionIdentity.operationId,
        globalId: transactionIdentity.globalId,
        originNodeId: state.nodeIdentity.nodeId,
        originSequence: state.nodeIdentity.originSequence,
        documentNumberScope: `offline:${type}`,
      });
      addAudit(state, currentUser, 'create', 'transaction', transaction.id);
      return json(transaction, 201);
    });
  }
  const transactionId = idFrom(pathname, 'transactions');
  if (transactionId && pathname === `/api/transactions/${transactionId}` && method === 'GET') {
    return read((state) => {
      const transaction = state.transactions.find((entry) => entry.id === transactionId);
      return transaction ? json(transaction) : failure(404, 'السند غير موجود');
    });
  }
  if (transactionId && pathname === `/api/transactions/${transactionId}/print` && method === 'GET') {
    return read((state) => json(state.transactions.find((entry) => entry.id === transactionId) ?? null));
  }

  if (pathname === '/api/custodies' && method === 'GET') return json([]);

  if (pathname === '/api/dashboard/stats' && method === 'GET') {
    return read((state) => {
      const activeItems = state.items.filter((item) => item.isActive !== false);
      const belowMin = activeItems.filter((item) => numberValue(item.currentStock) <= numberValue(item.minStock)).length;
      return json({
        totalItems: activeItems.length,
        totalEquipment: state.equipment.length,
        lowStockItems: belowMin,
        nearExpiryItems: activeItems.filter((item) => item.expiryDate).length,
        totalTransactions: state.transactions.length,
      });
    });
  }
  if (pathname === '/api/dashboard/charts' && method === 'GET') return json({ movements: [], stockByCategory: [] });

  if (pathname === '/api/alerts' && method === 'GET') return read((state) => json(state.alerts));
  if (pathname === '/api/alerts/read-all' && method === 'POST') return mutate((state) => {
    state.alerts.forEach((alert) => { alert.isRead = true; });
    return json({ ok: true });
  });
  const alertId = idFrom(pathname, 'alerts');
  if (alertId && pathname === `/api/alerts/${alertId}/read` && method === 'POST') return mutate((state) => {
    const alert = state.alerts.find((entry) => entry.id === alertId);
    if (alert) alert.isRead = true;
    return json({ ok: true });
  });
  if (alertId && pathname === `/api/alerts/${alertId}/resolve` && method === 'POST') return mutate((state) => {
    state.alerts = state.alerts.filter((entry) => entry.id !== alertId);
    return json({ ok: true });
  });
  if (pathname === '/api/alerts/refresh' && method === 'POST') return json({ ok: true });
  if (pathname === '/api/alerts/stream' && method === 'GET') return new Response('', { status: 204, headers: { [OFFLINE_HEADER]: '1' } });

  if (pathname.startsWith('/api/reports/')) {
    return read((state) => {
      if (pathname === '/api/reports/stock') return json(state.items.filter((item) => item.isActive !== false).map((item) => itemWithCategory(state, item)));
      if (pathname === '/api/reports/equipment') return json(state.equipment);
      if (pathname === '/api/reports/expiry') return json(state.items.filter((item) => item.expiryDate));
      if (pathname === '/api/reports/below-min') return json(state.items.filter((item) => numberValue(item.currentStock) <= numberValue(item.minStock)));
      if (pathname === '/api/reports/movements') return json(state.transactions);
      if (pathname === '/api/reports/stock-position') return json(state.items);
      if (pathname === '/api/reports/custodies') return json([]);
      return failure(404, 'التقرير غير موجود');
    });
  }

  if (pathname === '/api/users' && method === 'GET') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return read((state) => json(state.users.map(publicUser)));
  }
  if (pathname === '/api/users' && method === 'POST') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return mutate(async (state) => {
      const body = readBody(init);
      const username = text(body.username);
      if (state.users.some((user) => user.username === username)) return failure(409, 'Username already taken');
      const salt = crypto.randomUUID();
      const user = {
        id: nextId(state),
        username,
        fullName: text(body.fullName),
        role: (text(body.role, 'viewer') as PublicUser['role']),
        passwordHash: await passwordHash(text(body.password, 'ChangeMe123'), salt),
        passwordSalt: salt,
        isActive: body.isActive !== false,
        createdAt: now(),
      };
      state.users.push(user);
      return json(publicUser(user), 201);
    });
  }
  const userId = idFrom(pathname, 'users');
  if (userId && pathname === `/api/users/${userId}` && method === 'PUT') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      const user = state.users.find((entry) => entry.id === userId);
      if (!user) return failure(404, 'المستخدم غير موجود');
      Object.assign(user, readBody(init));
      return json(publicUser(user));
    });
  }
  if (userId && pathname === `/api/users/${userId}` && method === 'DELETE') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      state.users = state.users.filter((entry) => entry.id !== userId);
      if (state.currentUserId === userId) state.currentUserId = null;
      return json({ ok: true });
    });
  }

  if (pathname === '/api/settings' && method === 'GET') return read((state) => json(state.settings));
  if (pathname === '/api/settings' && method === 'PUT') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return mutate((state) => {
      Object.assign(state.settings, readBody(init), { updatedAt: now() });
      return json(state.settings);
    });
  }
  if (pathname === '/api/settings/profile' && method === 'PATCH') {
    return mutate((state) => {
      const user = state.users.find((entry) => entry.id === currentUser.id);
      if (!user) return failure(404, 'المستخدم غير موجود');
      Object.assign(user, { fullName: text(readBody(init).fullName, user.fullName) });
      return json(publicUser(user));
    });
  }
  if (pathname === '/api/settings/change-password' && method === 'POST') {
    return mutate(async (state) => {
      const user = state.users.find((entry) => entry.id === currentUser.id);
      if (!user) return failure(404, 'المستخدم غير موجود');
      const body = readBody(init);
      if (text(body.newPassword).length < 8) return failure(400, 'Password must be at least 8 characters');
      const salt = crypto.randomUUID();
      user.passwordSalt = salt;
      user.passwordHash = await passwordHash(text(body.newPassword), salt);
      return json({ ok: true });
    });
  }
  if (pathname === '/api/settings/my-activity' && method === 'GET') return read((state) => json(state.auditLog.filter((entry) => entry.userId === currentUser.id)));
  if (pathname === '/api/audit' && method === 'GET') {
    if (!roleAllowed(currentUser, ['admin'])) return failure(403, 'ليس لديك صلاحية');
    return read((state) => json(paged(state.auditLog, searchParams)));
  }
  if (pathname === '/api/backup/info' && method === 'GET') return read((state) => json({ version: 1, size: JSON.stringify(state).length, updatedAt: state.settings.updatedAt }));
  if (pathname === '/api/backup/export' && method === 'GET') return read((state) => new Response(JSON.stringify({ version: 1, exportedAt: now(), data: state }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'content-disposition': 'attachment; filename="damascus-backup.json"', [OFFLINE_HEADER]: '1' },
  }));
  if (pathname === '/api/backup/restore' && method === 'POST') return failure(400, 'استخدم استيراد النسخة الاحتياطية من داخل التطبيق');

  return failure(404, 'المسار غير موجود في الوضع المحلي');
}

export function installOfflineApi() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
    if (!url.pathname.startsWith('/api/')) return originalFetch(input, init);
    try {
      return await route(url.pathname, url.searchParams, init?.method ?? (input instanceof Request ? input.method : 'GET'), init);
    } catch (error) {
      console.error('Offline API error:', error);
      return failure(500, error instanceof Error ? error.message : 'تعذر تنفيذ العملية المحلية');
    }
  };
}