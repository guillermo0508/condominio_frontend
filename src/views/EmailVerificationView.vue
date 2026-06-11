<template>
  <div class="email-verification-view">
    <EmailVerification :email="email" />
  </div>
</template>

<script setup lang="ts">
import EmailVerification from '@/components/EmailVerification.vue'

interface Props {
  email: string
}

defineProps<Props>()
</script>

<style scoped>
.email-verification-view {
  width: 100%;
  min-height: 100vh;
}
</style>
