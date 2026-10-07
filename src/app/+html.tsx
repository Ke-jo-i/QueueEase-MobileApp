import { type PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function RootHtml({ children }: PropsWithChildren) {
  return <html lang="en"><head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Queue Ease registrar portal for requesting tickets, following window queues and serving students." />
    <ScrollViewStyleReset />
    <style>{`html, body, #root { overflow: clip; }`}</style>
  </head><body>{children}</body></html>;
}
