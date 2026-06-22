<template>
  <div class="chrome-version-select">
    <el-select
      v-model="selectedVersion"
      filterable
      :placeholder="loading ? '加载中...' : '选择 Chrome 版本'"
      :loading="loading"
      style="width: 100%"
      popper-class="chrome-version-dropdown"
      @change="handleChange"
    >
      <el-option
        v-for="item in sortedVersions"
        :key="item.version"
        :value="item.version"
        :label="item.version"
        :disabled="!item.downloaded"
      >
        <span>{{ item.version }}</span>
        <span v-if="item.downloaded" class="tag-ok">已下载</span>
        <span v-else class="tag-dl" @click.stop="handleDownload(item)">
          {{ downloadingVersion === item.version ? downloadProgress + '%' : '下载' }}
        </span>
      </el-option>
    </el-select>

    <div v-if="downloadingVersion" class="download-bar">
      <span>下载 Chrome {{ downloadingVersion }}...</span>
      <el-progress
        :percentage="downloadProgress"
        :status="downloadStatus === 'failed' ? 'exception' : ''"
        :color="downloadStatus === 'failed' ? '#f56c6c' : '#00FF38'"
        :stroke-width="10"
        :text-inside="true"
        style="flex: 1; margin-left: 12px"
      />
    </div>
  </div>
</template>

<script>
import { chromeSend } from '@/api/native'

export default {
  name: 'ChromeVersionSelector',
  props: {
    value: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      loading: false,
      versions: [],
      selectedVersion: this.value,
      downloadingVersion: null,
      downloadProgress: 0,
      downloadStatus: ''
    }
  },
  computed: {
    sortedVersions() {
      return [...this.versions].sort((a, b) => {
        if (a.downloaded !== b.downloaded) return b.downloaded - a.downloaded
        return Number(b.version.split('.')[0]) - Number(a.version.split('.')[0])
      })
    }
  },
  watch: {
    value(val) {
      this.selectedVersion = val
    }
  },
  async created() {
    await this.loadVersions()
    this.listenDownloadProgress()
  },
  methods: {
    async loadVersions() {
      this.loading = true
      const ret = await chromeSend('getChromeVersions').catch(() => ({ data: [] }))
      this.versions = ret?.data || []
      this.loading = false
    },
    listenDownloadProgress() {
      window.electronAPI.onChromeDownloadProgress?.(data => {
        if (data.version !== this.downloadingVersion) return
        this.downloadProgress = data.progress
        this.downloadStatus = data.status

        if (data.status === 'completed') {
          this.$message.success(`Chrome ${data.version} 下载完成`)
          this.downloadingVersion = null
          this.downloadProgress = 0
          this.downloadStatus = ''
          this.loadVersions()
          this.selectedVersion = data.version
          this.$emit('input', data.version)
          this.$emit('change', data.version)
        } else if (data.status === 'failed') {
          this.$message.error('下载失败: ' + (data.error || '未知错误'))
          this.downloadingVersion = null
        }
      })
    },
    handleChange(val) {
      this.$emit('input', val)
      this.$emit('change', val)
    },
    async handleDownload(item) {
      this.downloadingVersion = item.version
      this.downloadProgress = 0
      this.downloadStatus = 'downloading'
      await chromeSend('downloadChromeEngine', {
        version: item.version,
        downloadUrl: item.downloadUrl
      }).catch(e => {
        this.$message.error(e.message)
        this.downloadingVersion = null
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.download-bar {
  display: flex;
  align-items: center;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  font-size: 12px;
  color: #e0e0e0;
}
</style>

<style lang="scss">
.el-select-dropdown.chrome-version-dropdown {
  background: #1a1a1a !important;
  border: 1px solid #00FF38 !important;

  .el-select-dropdown__item {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    height: 36px !important;
    line-height: 36px !important;
    color: #e0e0e0 !important;
    background: #1a1a1a !important;

    &.hover, &:hover {
      background: #2a2a2a !important;
    }

    &.selected {
      color: #00FF38 !important;
      font-weight: bold;
    }

    &.is-disabled {
      color: #e0e0e0 !important;
      background: #1a1a1a !important;
    }
  }

  .tag-ok {
    font-size: 12px;
    color: #00FF38 !important;
  }

  .tag-dl {
    font-size: 12px;
    color: #00FF38 !important;
    cursor: pointer;

    &:hover {
      color: #00cc2e !important;
    }
  }

  .popper__arrow {
    border-bottom-color: #00FF38 !important;

    &::after {
      border-bottom-color: #1a1a1a !important;
    }
  }
}
</style>
