type StudioOperation = "save" | "delete" | "upload" | "export" | "publish";
type OperationState = { active: { kind: StudioOperation; token: symbol } | null; exportRequired: boolean };

const shared = globalThis as typeof globalThis & { gestaltStudioOperation?: OperationState };
const state = shared.gestaltStudioOperation ??= { active: null, exportRequired: false };

export function beginStudioOperation(kind: StudioOperation): (() => void) | null {
  if (state.active) return null;
  const token = Symbol(kind);
  state.active = { kind, token };
  return () => {
    if (state.active?.token === token) state.active = null;
  };
}

export function setStaticExportRequired(required: boolean) {
  state.exportRequired = required;
}

export function isStaticExportRequired() {
  return state.exportRequired;
}
