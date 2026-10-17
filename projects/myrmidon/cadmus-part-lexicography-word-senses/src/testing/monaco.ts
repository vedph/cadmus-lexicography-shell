import { Provider, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NgxMonacoEditorComponent } from '@jean-merelis/ngx-monaco-editor';
import {
  NgxMonacoEditorFakeComponent,
  provideMockMonacoEditor,
} from '@jean-merelis/ngx-monaco-editor/testing';

/**
 * A mock of the Monaco standalone code editor, as received by components
 * from the editorInitialized event. Commands added to it are collected in
 * commands, so that tests can run them like keyboard shortcuts would do.
 */
export function createMonacoEditorMock(selectedText = 'selected') {
  const commands = new Map<number, () => void>();
  const selection = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 9 };
  const editor = {
    focus: vi.fn(),
    addCommand: vi.fn((key: number, handler: () => void) => {
      commands.set(key, handler);
      return null;
    }),
    getSelection: vi.fn(() => selection),
    getModel: vi.fn(() => ({ getValueInRange: vi.fn(() => selectedText) })),
    executeEdits: vi.fn(() => true),
  };
  return { editor, commands, selection };
}

/**
 * Replace the Monaco editor with the fake one provided by its package in the
 * specified components. The fake renders a plain textarea, and emits
 * editorInitialized with the specified mock editor. Call before rendering,
 * and add the returned providers to the rendered component.
 */
export function stubMonacoEditor(
  editor: ReturnType<typeof createMonacoEditorMock>['editor'],
  ...components: Type<unknown>[]
): Provider[] {
  for (const component of components) {
    TestBed.overrideComponent(component, {
      remove: { imports: [NgxMonacoEditorComponent] },
      add: { imports: [NgxMonacoEditorFakeComponent] },
    });
  }
  return [provideMockMonacoEditor({ initializedEvent: { editor, monaco: {} } as any })];
}
