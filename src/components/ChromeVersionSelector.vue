<template>
  <div class="chrome-version-select">
    <el-select
      v-model="selectedVersion"
      filterable
      :placeholder="loading ? '加载中...' : '选择 Chrome 版本'"
      :loading="loading"
      style="width: 100%"
      @change="handleChange"
    >
      <el-option-group label="已下载">
        <el-option
          v-for="item in downloadedVersions"
          :key="item.version"
          :value="item.version"
          :label="item.version"
        >
          <span style="float: left">{{ item.version }}</span>
          <span style="float: right; color: #67c23a; font-size: 12px">已下载</span>
        </el-option>
      </el-option-group>
      <el-option-group label="未下载">
        <el-option
          v-for="item in undownloadedVersions"
          :key="item.version"
          :value="item.version"
          :label="item.version"
          disabled
        >
          <span style="float: left">{{ item.version }}</span>
          <el-button
            type="text"
            size="mini"
            style="float: right"
            @click.stop="handleDownload(item)"
          >
            <span v-if="downloadingVersion === item.version" style="color: #e6a23c">
              {{ downloadProgress }}%
            </span>
            <span v-else style="color: #409eff">下载</span>
          </el-button>
        </el-option>
      </el-option-group>
    </el-select>

    <div v-if="downloadingVersion" class="download-bar">
      <span>下载 Chrome {{ downloadingVersion }}...</span>
      <el-progress
        :percentage="downloadProgress"
        :status="downloadStatus === 'failed' ? 'exception' : ''"
        :color="downloadStatus === 'failed' ? '#f56c6c' : '#67c23a'"
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
    downloadedVersions() {
      return this.versions.filter(v => v.downloaded)
    },
    undownloadedVersions() {
      return this.versions.filter(v => !v.downloaded)
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
