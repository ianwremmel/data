import type {UserSession} from './__generated__/actions';

/** cdc handler **/
export async function handler(session: UserSession): Promise<void> {
  console.log('TEST MESSAGE', JSON.stringify(session));
}
