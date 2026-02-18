import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { isCuid } from '../validation/cuid.util';

export function IsCuid(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isCuid',
      target: object.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return isCuid(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid CUID`;
        },
      },
    });
  };
}
