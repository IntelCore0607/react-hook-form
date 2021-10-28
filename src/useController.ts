import * as React from 'react';

import getControllerValue from './logic/getControllerValue';
import isNameInFieldArray from './logic/isNameInFieldArray';
import get from './utils/get';
import { EVENTS } from './constants';
import {
  Field,
  FieldPathWithValue,
  FieldValues,
  InternalFieldName,
  UseControllerProps,
  UseControllerReturn,
} from './types';
import { useFormContext } from './useFormContext';
import { useFormState } from './useFormState';
import { useWatch } from './useWatch';

export function useController<
  TFieldValues extends FieldValues = FieldValues,
  TResult = any,
  TName extends FieldPathWithValue<TFieldValues, TResult> = FieldPathWithValue<
    TFieldValues,
    TResult
  >,
>(
  props: UseControllerProps<TFieldValues, TResult, TName>,
): UseControllerReturn<TFieldValues, TResult, TName> {
  const methods = useFormContext<TFieldValues>();
  const { name, control = methods.control, shouldUnregister } = props;
  const value = useWatch({
    control,
    name,
    defaultValue: get(
      control._formValues,
      name,
      get(control._defaultValues, name, props.defaultValue),
    ),
  });
  const formState = useFormState({
    control,
    name,
  });
  const _name = React.useRef(name);

  _name.current = name;

  const registerProps = control.register(name, {
    ...props.rules,
    value,
  });

  React.useEffect(() => {
    const updateMounted = (name: InternalFieldName, value: boolean) => {
      const field: Field = get(control._fields, name);

      if (field) {
        field._f.mount = value;
      }
    };

    updateMounted(name, true);

    return () => {
      const _shouldUnregisterField =
        control._options.shouldUnregister || shouldUnregister;

      if (
        isNameInFieldArray(control._names.array, name)
          ? _shouldUnregisterField && !control._stateFlags.action
          : _shouldUnregisterField
      ) {
        control.unregister(name);
      } else {
        updateMounted(name, false);
      }
    };
  }, [name, control, shouldUnregister]);

  return {
    field: {
      onChange: (event: any) => {
        const value = getControllerValue(event);
        registerProps.onChange({
          target: {
            value,
            name: name as InternalFieldName,
          },
          type: EVENTS.CHANGE,
        });
      },
      onBlur: () => {
        registerProps.onBlur({
          target: {
            value,
            name: name as InternalFieldName,
          },
          type: EVENTS.BLUR,
        });
      },
      name,
      value,
      ref: (elm) => {
        const field = get(control._fields, name);

        if (elm && field && elm.focus) {
          field._f.ref = {
            focus: () => elm.focus(),
            setCustomValidity: (message: string) =>
              elm.setCustomValidity(message),
            reportValidity: () => elm.reportValidity(),
          };
        }
      },
    },
    formState,
    fieldState: {
      invalid: !!get(formState.errors, name),
      isDirty: !!get(formState.dirtyFields, name),
      isTouched: !!get(formState.touchedFields, name),
      error: get(formState.errors, name),
    },
  };
}
