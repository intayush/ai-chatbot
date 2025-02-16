import {createDataStreamResponse, embed, type Message, smoothStream, streamText} from 'ai';
import {openai} from '@ai-sdk/openai';
import {auth} from '@/app/(auth)/auth';
import {models} from '@/lib/ai/models';
import {systemPrompt} from '@/lib/ai/prompts';
import {deleteChatById, getChatById, saveChat, saveMessages,} from '@/lib/db/queries';
import {generateUUID, getMostRecentUserMessage, sanitizeResponseMessages,} from '@/lib/utils';
import {generateTitleFromUserMessage} from '../../actions';
import {createDocument} from '@/lib/ai/tools/create-document';
import {updateDocument} from '@/lib/ai/tools/update-document';
import {requestSuggestions} from '@/lib/ai/tools/request-suggestions';
import {getWeather} from '@/lib/ai/tools/get-weather';
import {queryDatabase} from '@/lib/ai/tools/query-database';
import {customModel} from "@/lib/ai";
import { getInformation } from '@/lib/ai/tools/get-information';

export const maxDuration = 60;

type AllowedTools =
  | 'createDocument'
  | 'updateDocument'
  | 'requestSuggestions'
  | 'getWeather'
  | 'getInformation'
  | 'queryDatabase'
// | 'generateReport';

let allTools: AllowedTools[] = ['createDocument', 'updateDocument', 'requestSuggestions', 'getInformation', 'getWeather', 'queryDatabase'];

export async function POST(request: Request) {
  const {
    id,
    messages,
    modelId,
  }: { id: string; messages: Array<Message>; modelId: string } =
    await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const model = models.find((model) => model.id === modelId);

  if (!model) {
    return new Response('Model not found', { status: 404 });
  }

  const userMessage = getMostRecentUserMessage(messages);

  if (!userMessage) {
    return new Response('No user message found', { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  await saveMessages({
    messages: [{ ...userMessage, createdAt: new Date(), chatId: id, promptTokens: '0', completionTokens: '0', totalTokens: '0' }],
  });

  return createDataStreamResponse({
    execute: (dataStream) => {
      const userQuery = messages
        .filter((msg) => msg.role === "user")
        .pop()?.content;
      if(userQuery?.toLowerCase()?.includes("@query")) {
        allTools = ['queryDatabase'];
      }else if(userQuery?.toLowerCase().includes("@find")) {
        allTools = ['getInformation']
      }
      const result = streamText({
        model: customModel(model.apiIdentifier, model.provider),
        system: systemPrompt,
        messages,
        maxSteps: 5,
        experimental_activeTools: allTools,
        experimental_transform: smoothStream({ chunking: 'word' }),
        experimental_generateMessageId: generateUUID,
        tools: {
          getWeather,
          //generateReport: generateReport({session, dataStream, model }),
          createDocument: createDocument({ session, dataStream, model }),
          updateDocument: updateDocument({ session, dataStream, model }),
          requestSuggestions: requestSuggestions({
            session,
            dataStream,
            model,
          }),
          getInformation,
          queryDatabase: queryDatabase(customModel(model.apiIdentifier, model.provider))
        },
        onFinish: async ({ response, usage }) => {
          if (session.user?.id) {
            try {
              const responseMessagesWithoutIncompleteToolCalls =
                sanitizeResponseMessages(response.messages);

              await saveMessages({
                messages: responseMessagesWithoutIncompleteToolCalls.map(
                  (message) => {
                    return {
                      id: message.id,
                      chatId: id,
                      role: message.role,
                      content: message.content,
                      createdAt: new Date(),
                      promptTokens: `${usage.promptTokens}`,
                      completionTokens: `${usage.completionTokens}`,
                      totalTokens: `${usage.totalTokens}`
                    };
                  },
                ),
              });
            } catch (error) {
              console.error('Failed to save chat');
            }
          }
        },
        experimental_telemetry: {
          isEnabled: true,
          functionId: 'stream-text',
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
