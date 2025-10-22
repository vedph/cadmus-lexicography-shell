import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors, withJsonpSupport } from '@angular/common/http';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideRouter, withViewTransitions } from '@angular/router';

import { AUTH_JWT_EXCLUDED_URLS, jwtInterceptor } from '@myrmidon/auth-jwt-login';

// third-party modules
import { NgxEchartsModule } from 'ngx-echarts';
import { NgeMonacoModule } from '@cisstech/nge/monaco';
import { NgeMarkdownModule } from '@cisstech/nge/markdown';

// text editor plugins
import { MdBoldCtePlugin, MdItalicCtePlugin, MdLinkCtePlugin } from '@myrmidon/cadmus-text-ed-md';
import { TxtEmojiCtePlugin } from '@myrmidon/cadmus-text-ed-txt';
import {
  CADMUS_TEXT_ED_BINDINGS_TOKEN,
  CADMUS_TEXT_ED_SERVICE_OPTIONS_TOKEN,
  CadmusTextEdService,
} from '@myrmidon/cadmus-text-ed';

// locals
import { routes } from './app.routes';
import { INDEX_LOOKUP_DEFINITIONS } from './index-lookup-definitions';
import { ITEM_BROWSER_KEYS } from './item-browser-keys';
import { PART_EDITOR_KEYS } from './part-editor-keys';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([jwtInterceptor]), withJsonpSupport()),
    provideNativeDateAdapter(),
    importProvidersFrom(
      NgxEchartsModule.forRoot({
        echarts: () => import('echarts'),
      })
    ),
    importProvidersFrom(NgeMonacoModule.forRoot({})),
    importProvidersFrom(NgeMarkdownModule),
    // parts and fragments type IDs to editor group keys mappings
    // https://github.com/nrwl/nx/issues/208#issuecomment-384102058
    // inject like: @Inject('partEditorKeys') partEditorKeys: PartEditorKeys
    {
      provide: 'partEditorKeys',
      useValue: PART_EDITOR_KEYS,
    },
    // index lookup definitions
    {
      provide: 'indexLookupDefinitions',
      useValue: INDEX_LOOKUP_DEFINITIONS,
    },
    // item browsers IDs to editor keys mappings
    // inject like: @Inject('itemBrowserKeys') itemBrowserKeys: { [key: string]: string }
    {
      provide: 'itemBrowserKeys',
      useValue: ITEM_BROWSER_KEYS,
    },
    // URLs excluded from JWT auth
    {
      provide: AUTH_JWT_EXCLUDED_URLS,
      useValue: ['https://viaf.org/viaf/'],
    },
    // text editor plugins
    // https://github.com/vedph/cadmus-bricks-shell-v2/blob/master/projects/myrmidon/cadmus-text-ed/README.md
    MdBoldCtePlugin,
    MdItalicCtePlugin,
    TxtEmojiCtePlugin,
    MdLinkCtePlugin,
    {
      provide: CADMUS_TEXT_ED_SERVICE_OPTIONS_TOKEN,
      useFactory: (
        mdBoldCtePlugin: MdBoldCtePlugin,
        mdItalicCtePlugin: MdItalicCtePlugin,
        txtEmojiCtePlugin: TxtEmojiCtePlugin,
        mdLinkCtePlugin: MdLinkCtePlugin
      ) => {
        return {
          plugins: [mdBoldCtePlugin, mdItalicCtePlugin, txtEmojiCtePlugin, mdLinkCtePlugin],
        };
      },
      deps: [MdBoldCtePlugin, MdItalicCtePlugin, TxtEmojiCtePlugin, MdLinkCtePlugin],
    },
    CadmusTextEdService,
    // monaco bindings for plugins
    // 2080 = monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB;
    // 2087 = monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI;
    // 2083 = monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE;
    // 2090 = monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL;
    {
      provide: CADMUS_TEXT_ED_BINDINGS_TOKEN,
      useValue: {
        2080: 'md.bold', // Ctrl+B
        2087: 'md.italic', // Ctrl+I
        2083: 'txt.emoji', // Ctrl+E
        2090: 'md.link', // Ctrl+L
      },
    },
  ],
};
