export enum ApprovalUploadMethod {
  COMPUTER = 'computer',
  LINK = 'link',
}

export const APPROVAL_UPLOAD_METHODS: ApprovalUploadMethod[] = [ApprovalUploadMethod.COMPUTER, ApprovalUploadMethod.LINK];

export function isDriveLinkMethod(method: ApprovalUploadMethod): boolean {
  return method === ApprovalUploadMethod.LINK;
}
