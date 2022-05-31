/**
 * A collection of possible error and warning messages.
 */
export const ErrorMessage = {
  ItemNotFound: (itemName: string) => `${itemName} could not be found`,
  ItemOrItemsNotFound: (itemsName: string) =>
    `one or more ${itemsName} could not be found`,
  TooManyItemsRequested: (itemsName: string) => `too many ${itemsName} requested`,
  ForbiddenAction: () => 'you are not authorized to take this action',
  DuplicateFieldValue: (prop: string) => `an item with that "${prop}" already exists`,
  DuplicateSetMember: (prop: string) =>
    `duplicate elements in \`${prop}\` are not allowed`,
  InvalidField: (prop: string) =>
    `the \`${prop}\` field is not allowed with this type of item`,
  InvalidFieldValue: (prop: string) =>
    `\`${prop}\` field has a missing, invalid, or illegal value`,
  InvalidArrayValue: (prop: string) =>
    `a \`${prop}\` array element has an invalid or illegal value`,
  InvalidObjectKeyValue: (prop: string) =>
    `a \`${prop}\` object key has an invalid or illegal value`,
  IllegalUsername: () => 'a user with that username cannot be created',
  InvalidJSON: () => 'encountered invalid JSON',
  InvalidStringLength: (
    prop: string,
    min: number | string,
    max: number | string | null,
    syntax: 'string' | 'alphanumeric' | 'hexadecimal' | 'bytes' = 'alphanumeric',
    nullable = false,
    isArray = false
  ) =>
    `${isArray ? `each \`${prop}\` element` : `\`${prop}\``} must be a${
      syntax == 'alphanumeric'
        ? 'n alphanumeric'
        : syntax == 'hexadecimal'
        ? ' hexadecimal'
        : ''
    } ${
      max
        ? `string between ${min} and ${max} ${
            syntax == 'bytes' ? 'byte' : 'character'
          }s (inclusive)`
        : `${min} ${syntax == 'bytes' ? 'byte' : 'character'} string`
    }${nullable ? ' or null' : ''}`,
  UnknownField: (prop: string) => `encountered unknown or illegal field \`${prop}\``,
  InvalidSpecifier: (prop: string, sub = false) =>
    `\`${prop}\`: invalid ${sub ? 'sub-' : ''}specifier`,
  InvalidSpecifierValue: (prop: string, sub = false) =>
    `\`${prop}\`: invalid ${sub ? 'sub-' : ''}specifier value`,
  InvalidRegexString: (prop: string) => `\`${prop}\`: invalid regex value`,
  InvalidMatcher: (prop: string) => `invalid \`${prop}\`: must be an object`,
  InvalidSpecifierCombination: () => `invalid combination of specifiers`,
  InvalidObjectId: (id: string) => `invalid ${id}`
};
