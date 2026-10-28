<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string;
    allowEdit?: boolean;
    allowAdd?: boolean;
    allowDuplicate?: boolean;
    editableName: string;
    alignVertical?: boolean;
  }>(),
  {
    allowEdit: false,
    allowAdd: false,
    allowDuplicate: false,
    alignVertical: false,
  },
);

const emit = defineEmits<{
  delete: [value: string];
  new: [value: string];
  duplicate: [oldName: string, newName: string];
  rename: [oldName: string, newName: string];
}>();

enum EditState {
  None,
  Editing,
  Adding,
  Duplicating,
}

const localName = ref<string>('');
const mode = ref<EditState>(EditState.None);
onMounted(() => {
  localName.value = props.modelValue;
});

function abort() {
  mode.value = EditState.None;
  localName.value = props.modelValue;
}

function duplicate() {
  localName.value = localName.value + ' (copy)';
  mode.value = EditState.Duplicating;
}

function addNewClick() {
  localName.value = '';
  mode.value = EditState.Adding;
}

watch(
  () => props.modelValue,
  () => {
    localName.value = props.modelValue;
  },
);

function saveNewName() {
  if (mode.value === EditState.Adding) {
    emit('new', localName.value);
  } else if (mode.value === EditState.Duplicating) {
    emit('duplicate', props.modelValue, localName.value);
  } else {
    // Editing
    emit('rename', props.modelValue, localName.value);
  }
  mode.value = EditState.None;
}
</script>

<template>
  <form class="flex flex-row" @submit.prevent="saveNewName">
    <div class="grow">
      <slot v-if="mode === EditState.None"> </slot>
      <UInput v-else v-model="localName" class="w-full"> </UInput>
    </div>
    <div class="mt-auto ms-1 flex gap-0.5" :class="alignVertical ? 'flex-col' : 'flex-row'">
      <template v-if="allowEdit && mode === EditState.None">
        <UButton
          color="neutral"
          variant="ghost"
          :title="`Rename this ${editableName}`"
          :aria-label="`Rename this ${editableName}`"
          icon="mdi:pencil"
          @click="mode = EditState.Editing"
        />
        <UButton
          v-if="allowDuplicate"
          color="neutral"
          variant="ghost"
          :title="`Duplicate this ${editableName}`"
          :aria-label="`Duplicate this ${editableName}`"
          icon="mdi:content-copy"
          @click="duplicate"
        />
        <UButton
          color="neutral"
          variant="ghost"
          :title="`Delete this ${editableName}`"
          :aria-label="`Delete this ${editableName}`"
          icon="mdi:delete"
          @click="$emit('delete', modelValue)"
        />
      </template>
      <UButton
        v-if="allowAdd && mode === EditState.None"
        :title="`New ${editableName}`"
        :aria-label="`New ${editableName}`"
        icon="mdi:plus"
        color="neutral"
        variant="ghost"
        @click="addNewClick"
      />
      <template v-if="mode !== EditState.None">
        <UButton
          title="Save"
          aria-label="Save"
          icon="mdi:check"
          variant="solid"
          @click="saveNewName"
        />
        <UButton
          title="Cancel"
          aria-label="Cancel"
          color="neutral"
          variant="ghost"
          icon="mdi:close"
          @click="abort"
        />
      </template>
    </div>
  </form>
</template>
