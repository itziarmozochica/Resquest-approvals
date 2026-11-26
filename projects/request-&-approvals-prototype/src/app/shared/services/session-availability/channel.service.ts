import { Injectable } from '@angular/core';

import { Channel } from './channel.enum';

@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  constructor() {}

  static isInvitation(channel: Channel): boolean {
    const invitationChannels: Array<Channel> = [Channel.Invitation, Channel.InvitationLivGolf];
    return invitationChannels.includes(channel);
  }
}
