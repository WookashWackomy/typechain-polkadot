import type { ContractPromise } from '@polkadot/api-contract';
import { handleEventReturn } from './query';

export type EventTypeDescritpionBodyContent = string | number[] | Record<string, any>;

export interface EventDescriptorBodyItem {
  name: string;
  body?: EventTypeDescritpionBodyContent;
  isResult: boolean;
  isPrimitive: boolean;
}

export interface EventDescriptorBody {
  [key: string]: EventDescriptorBodyItem;
}

export interface EventDescriptor {
  name: string;
  body: EventDescriptorBody;
  isResult: boolean;
  isPrimitive: boolean;
  signatureTopic: string;
}

export interface EventDataTypeDescriptions {
  [signatureTopic: string]: EventDescriptor;
}

export function getTypeDescription(id: number | string, types: EventDataTypeDescriptions): any {
  return types[id];
}

export function getEventTypeDescription(name: string, types: EventDataTypeDescriptions): any {
  return types[name];
}

export function decodeEvents(events: any[], contract: ContractPromise, types: EventDataTypeDescriptions): any[] {
  return events
    .filter((record: any) => {
      const { event } = record;

      const [address, _] = record.event.data;

      return event.method === 'ContractEmitted' && address.toString() === contract.address.toString();
    })
    .map((record: any) => {
      const [_, data] = record.event.data;
      const signatureTopic = record.topics[0].toString();

      const { args, event } =
        contract.abi.events[(contract.abi.json as any).spec.events.findIndex((e: any) => e.signature_topic === signatureTopic)]!.fromU8a(data);

      const _event: Record<string, any> = {};

      for (let i = 0; i < args.length; i++) {
        _event[event.args[i]!.name] = args[i]!.toJSON();
      }

      handleEventReturn(_event, getEventTypeDescription(signatureTopic, types));

      return {
        name: event.identifier.toString(),
        args: _event,
      };
    });
}

export function decodeEventsLegacy(events: any[], contract: ContractPromise, types: EventDataTypeDescriptions): any[] {
  return events
    .filter((record: any) => {
      const { event } = record;

      const [address, _] = record.event.data;

      return event.method === 'ContractEmitted' && address.toString() === contract.address.toString();
    })
    .map((record: any) => {
      const [_, data] = record.event.data;

      const { args, event } = contract.abi.decodeEvent(data);

      const _event: Record<string, any> = {};

      for (let i = 0; i < args.length; i++) {
        _event[event.args[i]!.name] = args[i]!.toJSON();
      }

      handleEventReturn(_event, getEventTypeDescription(event.identifier.toString(), types));

      return {
        name: event.identifier.toString(),
        args: _event,
      };
    });
}
