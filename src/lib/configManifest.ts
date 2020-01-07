
export interface DeviceConfigManifest {
	deviceConfig: ConfigManifestEntry[]
	deviceOAuthFlow?: DeviceOAuthFlow
	// subdeviceSummaryStringFormat: string // TODO - verify format
	// subDeviceConfig?: SubDeviceConfigManifest
}

export interface SubDeviceConfigManifest {
	defaultType: string
	config: { [type: string]: SubDeviceConfigManifestEntry[] | ConfigManifestEntry[] }
}

export interface DeviceOAuthFlow {
	credentialsHelp: string
	credentialsURL: string
}

// TODO - what about mappings from playout?

export enum ConfigManifestEntryType {
	LABEL = 'label',
	LINK = 'link',
	STRING = 'string',
	BOOLEAN = 'boolean',
	NUMBER = 'float',
	FLOAT = 'float',
	INT = 'int',
	CREDENTIALS = 'credentials', // TODO - parent only
	TABLE = 'table', // TODO - write this for HTTPSEND
	OBJECT = 'object',
	ENUM = 'enum' // @todo: implement
}

export type ConfigManifestEntry = ConfigManifestEntryBase | TableConfigManifestEntry | ConfigManifestEnumEntry | SubDeviceConfigManifestEntry
export interface ConfigManifestEntryBase {
	id: string
	name: string
	type: ConfigManifestEntryType
	values?: any // for enum
}
export interface ConfigManifestEnumEntry {
	type: ConfigManifestEntryType.ENUM
	values: any // for enum
}
export interface SubDeviceConfigManifestEntry extends ConfigManifestEntryBase {
	columnName?: string
	columnEditable?: boolean
	defaultVal?: any // TODO - is this wanted?
}

export interface TableConfigManifestEntry extends ConfigManifestEntryBase {
	/** Whether this follows the deviceId logic for updating */
	isSubDevices?: boolean
	subDeviceDefaultName?: string
	defaultType?: string
	type: ConfigManifestEntryType.TABLE
	deviceTypesMapping?: any
	typeField?: string
	/** Only one type means that the option will not be present */
	config: { [type: string]: ConfigManifestEntry[] }
}

// export interface ConfigManifestEntryString {

// }

export function literal<T> (o: T) { return o }

export const TEST_SPREADSHEET_DEVICE: DeviceConfigManifest = {
	deviceConfig: [
		{
			id: 'folderPath',
			name: 'Drive folder name',
			type: ConfigManifestEntryType.STRING
		},
		{
			id: 'debugLogging',
			name: 'Activate Debug Logging',
			type: ConfigManifestEntryType.BOOLEAN
		}
	],
	deviceOAuthFlow: {
		credentialsHelp: 'Go to the url below and click on the "Enable the Drive API button". Then click on "Download Client configuration", save the credentials.json file and upload it here.',
		credentialsURL: 'https://developers.google.com/drive/api/v3/quickstart/nodejs'

	}
}

export const TEST_MOS_DEVICE: DeviceConfigManifest = {
	deviceConfig: [
		{
			id: 'mosId',
			name: 'MOS ID of Gateway (Sofie MOS ID)',
			type: ConfigManifestEntryType.STRING

		},
		{
			id: 'debugLogging',
			name: 'Activate Debug Logging',
			type: ConfigManifestEntryType.BOOLEAN
		},
		{
			id: 'devices',
			name: 'Attached SubDevices',
			type: ConfigManifestEntryType.TABLE,
			isSubDevices: true,
			defaultType: 'default',
			config: {
				'default': [
					{
						id: 'primary.id',
						name: 'Primary ID (Newsroom System MOS ID)',
						columnName: 'Primary ID',
						type: ConfigManifestEntryType.STRING
					},
					{
						id: 'primary.host',
						name: 'Primary Host (IP or Hostname)',
						columnName: 'Primary Host',
						type: ConfigManifestEntryType.STRING
					},
					{
						id: 'secondary.id',
						name: 'Secondary ID (Newsroom System MOS ID)',
						columnName: 'Secondary ID',
						type: ConfigManifestEntryType.STRING
					},
					{
						id: 'secondary.host',
						name: 'Secondary Host (IP or Hostname)',
						columnName: 'Secondary Host',
						type: ConfigManifestEntryType.STRING
					}
				]
			}
		}
	]
}

export enum StorageType {
	LOCAL_FOLDER = 'local_folder',
	FILE_SHARE = 'file_share',
	UNKNOWN = 'unknown'
	// FTP = 'ftp',
	// AWS_S3 = 'aws_s3'
}
const MEDIA_MANAGER_STORAGE_COMMON: SubDeviceConfigManifestEntry[] = [
	{
		id: 'id',
		name: 'Storage ID',
		columnName: 'Storage ID',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'support.read',
		name: 'Allow Read',
		type: ConfigManifestEntryType.BOOLEAN
	},
	{
		id: 'support.write',
		name: 'Allow Write',
		type: ConfigManifestEntryType.BOOLEAN
	}
]
const MEDIA_MANAGER_STORAGE_CONFIG: SubDeviceConfigManifest['config'] = {}
MEDIA_MANAGER_STORAGE_CONFIG[StorageType.UNKNOWN] = [
	...MEDIA_MANAGER_STORAGE_COMMON
]
MEDIA_MANAGER_STORAGE_CONFIG[StorageType.FILE_SHARE] = [
	...MEDIA_MANAGER_STORAGE_COMMON,
	{
		id: 'options.basePath',
		name: 'Base Path',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.mediaPath',
		name: 'Media Path',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.mappedNetworkedDriveTarget',
		name: 'Mapped Network Drive',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.username',
		name: 'Username',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.password',
		name: 'Password',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.onlySelectedFiles',
		name: 'Don\'t Scan Entire Storage',
		type: ConfigManifestEntryType.BOOLEAN
	}
]
MEDIA_MANAGER_STORAGE_CONFIG[StorageType.LOCAL_FOLDER] = [
	...MEDIA_MANAGER_STORAGE_COMMON,
	{
		id: 'options.basePath',
		name: 'Base Path',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.mediaPath',
		name: 'Media Path',
		type: ConfigManifestEntryType.STRING
	}
]

export enum MediaFlowType {
	WATCH_FOLDER = 'watch_folder',
	LOCAL_INGEST = 'local_ingest',
	EXPECTED_ITEMS = 'expected_items',
	UNKNOWN = 'unknown'
}
const MEDIA_MANAGER_MEDIAFLOW_COMMON: SubDeviceConfigManifestEntry[] = [
	{
		id: 'id',
		name: 'Flow ID',
		columnName: 'Flow ID',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'sourceId',
		name: 'Source Storage',
		type: ConfigManifestEntryType.STRING // is actually a dropdown of storages
	}
]
const MEDIA_MANAGER_MEDIAFLOW_CONFIG: SubDeviceConfigManifest['config'] = {}
MEDIA_MANAGER_MEDIAFLOW_CONFIG[MediaFlowType.UNKNOWN] = [
	...MEDIA_MANAGER_MEDIAFLOW_COMMON
]
MEDIA_MANAGER_MEDIAFLOW_CONFIG[MediaFlowType.WATCH_FOLDER] = [
	...MEDIA_MANAGER_MEDIAFLOW_COMMON,
	{
		id: 'targetId',
		name: 'TargetStorage',
		type: ConfigManifestEntryType.STRING // dropdown
	}
]
MEDIA_MANAGER_MEDIAFLOW_CONFIG[MediaFlowType.LOCAL_INGEST] = [
	...MEDIA_MANAGER_MEDIAFLOW_COMMON
]
MEDIA_MANAGER_MEDIAFLOW_CONFIG[MediaFlowType.EXPECTED_ITEMS] = [
	...MEDIA_MANAGER_MEDIAFLOW_COMMON,
	{
		id: 'targetId',
		name: 'TargetStorage',
		type: ConfigManifestEntryType.STRING // dropdown
	}
]

export enum MediaMonitorType {
	NULL = 'null',
	MEDIA_SCANNER = 'mediascanner',
	QUANTEL = 'quantel'
}
const MEDIA_MANAGER_MEDIAMONITOR_COMMON: SubDeviceConfigManifestEntry[] = [
	{
		id: 'id',
		name: 'Monitor ID',
		columnName: 'Monitor ID',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'storageId',
		name: 'Storage ID',
		type: ConfigManifestEntryType.STRING // is actually a dropdown of storages
	}
]
const MEDIA_MANAGER_MEDIAMONITOR_CONFIG: SubDeviceConfigManifest['config'] = {}
MEDIA_MANAGER_MEDIAFLOW_CONFIG[MediaMonitorType.NULL] = []
MEDIA_MANAGER_MEDIAMONITOR_CONFIG[MediaMonitorType.MEDIA_SCANNER] = [
	...MEDIA_MANAGER_MEDIAMONITOR_COMMON,
	{
		id: 'host',
		name: 'Host',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'port',
		name: 'Port',
		type: ConfigManifestEntryType.STRING
	}
]
MEDIA_MANAGER_MEDIAMONITOR_CONFIG[MediaFlowType.WATCH_FOLDER] = [
	...MEDIA_MANAGER_MEDIAMONITOR_COMMON,
	{
		id: 'gatewayUrl',
		name: 'Gateway URL',
		type: ConfigManifestEntryType.STRING // dropdown
	},
	{
		id: 'ISAUrl',
		name: 'ISA URL',
		type: ConfigManifestEntryType.STRING // dropdown
	},
	{
		id: 'zoneId',
		name: 'Zone ID (leave blank for default)',
		type: ConfigManifestEntryType.STRING // dropdown
	},
	{
		id: 'serverId',
		name: 'Quantel Server ID',
		type: ConfigManifestEntryType.STRING // dropdown
	}
]

export const TEST_MEDIA_MANAGER_DEVICE: DeviceConfigManifest = {
	deviceConfig: [
		{
			id: 'workers',
			name: 'No. of Available Workers',
			type: ConfigManifestEntryType.INT
		},
		{
			id: 'lingerTime',
			name: 'File Linger Time',
			type: ConfigManifestEntryType.INT
		},
		{
			id: 'workFlowLingerTime',
			name: 'Workflow Linger Time',
			type: ConfigManifestEntryType.INT
		},
		{
			id: 'cronJobTime',
			name: 'Cron-Job Interval Time',
			type: ConfigManifestEntryType.INT
		},
		{
			id: 'mediaScanner.host',
			name: 'Media Scanner Host',
			type: ConfigManifestEntryType.STRING

		},
		{
			id: 'mediaScanner.port',
			name: 'Media Scanner Port',
			type: ConfigManifestEntryType.INT
		},
		{
			id: 'debugLogging',
			name: 'Activate Debug Logging',
			type: ConfigManifestEntryType.BOOLEAN
		},
		literal<TableConfigManifestEntry>({
			id: 'storages',
			name: 'Attached Storages',
			type: ConfigManifestEntryType.TABLE,
			defaultType: StorageType.UNKNOWN,
			config: MEDIA_MANAGER_STORAGE_CONFIG
		}),
		literal<TableConfigManifestEntry>({
			id: 'mediaFlows',
			name: 'Media Flows',
			type: ConfigManifestEntryType.TABLE,
			defaultType: MediaFlowType.UNKNOWN,
			typeField: 'mediaFlowType',
			config: MEDIA_MANAGER_MEDIAFLOW_CONFIG
		}),
		literal<TableConfigManifestEntry>({
			id: 'monitors',
			name: 'Monitors',
			type: ConfigManifestEntryType.TABLE,
			defaultType: MediaMonitorType.NULL,
			isSubDevices: true,
			config: MEDIA_MANAGER_MEDIAMONITOR_CONFIG
		})
	]
}

export enum TimelineContentTypeHttp {
	GET = 'get',
	POST = 'post',
	PUT = 'put',
	DELETE = 'delete'
}
export enum TSRDeviceType {
	ABSTRACT = 'abstract',
	CASPARCG = 'casparcg',
	ATEM = 'atem',
	LAWO = 'lawo',
	HTTPSEND = 'httpsend',
	PANASONIC_PTZ = 'panasonic_ptz',
	TCPSEND = 'tcpsend',
	HYPERDECK = 'hyperdeck',
	PHAROS = 'pharos',
	OSC = 'osc',
	HTTPWATCHER = 'httpwatcher',
	SISYFOS = 'sisyfos',
	QUANTEL = 'quantel'
}
export const TSRDeviceTypeValue = {
	[TSRDeviceType.ABSTRACT]: 0,
	[TSRDeviceType.CASPARCG]: 1,
	[TSRDeviceType.ATEM]: 2,
	[TSRDeviceType.LAWO]: 3,
	[TSRDeviceType.HTTPSEND]: 4,
	[TSRDeviceType.PANASONIC_PTZ]: 5,
	[TSRDeviceType.TCPSEND]: 6,
	[TSRDeviceType.HYPERDECK]: 7,
	[TSRDeviceType.PHAROS]: 8,
	[TSRDeviceType.OSC]: 9,
	[TSRDeviceType.HTTPWATCHER]: 10,
	[TSRDeviceType.SISYFOS]: 11,
	[TSRDeviceType.QUANTEL]: 12
}

const PLAYOUT_SUBDEVICE_CONFIG: SubDeviceConfigManifest['config'] = {}
const PLAYOUT_SUBDEVICE_COMMON: SubDeviceConfigManifestEntry[] = [
	{
		id: 'disable',
		name: 'Disable',
		type: ConfigManifestEntryType.BOOLEAN
	},
	{
		id: 'threadUsage',
		name: 'Thread Usage',
		type: ConfigManifestEntryType.FLOAT
	}
]
const PLAYOUT_SUBDEVICE_HOST_PORT = [
	{
		id: 'options.host',
		name: 'Host',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.port',
		name: 'Port',
		type: ConfigManifestEntryType.INT
	}
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.ABSTRACT] = [
	...PLAYOUT_SUBDEVICE_COMMON
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.CASPARCG] = [
	...PLAYOUT_SUBDEVICE_COMMON,
	...PLAYOUT_SUBDEVICE_HOST_PORT,
	{
		id: 'options.launcherHost',
		name: 'Launcher Host',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.launcherPort',
		name: 'Launcher Port',
		type: ConfigManifestEntryType.NUMBER
	}
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.ATEM] = [
	...PLAYOUT_SUBDEVICE_COMMON,
	...PLAYOUT_SUBDEVICE_HOST_PORT
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.LAWO] = [
	...PLAYOUT_SUBDEVICE_COMMON,
	...PLAYOUT_SUBDEVICE_HOST_PORT,
	{
		id: 'options.sourcesPath',
		name: 'Sources Path',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.rampMotorFunctionPath',
		name: 'Ramp Function Path',
		type: ConfigManifestEntryType.STRING
	}
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.HTTPSEND] = [
	...PLAYOUT_SUBDEVICE_COMMON,
	{
		id: 'options.makeReadyCommands',
		name: 'Make Ready Commands',
		type: ConfigManifestEntryType.TABLE,
		defaultType: 'default',
		config: {
			'default': [
				{
					id: 'url',
					name: 'URL',
					columnName: 'URL',
					type: ConfigManifestEntryType.STRING
				},
				{
					id: 'type',
					name: 'Type',
					columnName: 'Type',
					defaultVal: TimelineContentTypeHttp.GET,
					type: ConfigManifestEntryType.ENUM,
					values: TimelineContentTypeHttp
				},
				{
					id: 'params',
					name: 'Parameters',
					type: ConfigManifestEntryType.OBJECT
				}
			]
		}
	}
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.PANASONIC_PTZ] = [
	...PLAYOUT_SUBDEVICE_COMMON,
	...PLAYOUT_SUBDEVICE_HOST_PORT
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.TCPSEND] = [
	...PLAYOUT_SUBDEVICE_COMMON,
	...PLAYOUT_SUBDEVICE_HOST_PORT,
	{
		id: 'options.bufferEncoding',
		name: 'Buffer Encoding',
		type: ConfigManifestEntryType.STRING
	}
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.HYPERDECK] = [
	...PLAYOUT_SUBDEVICE_COMMON,
	...PLAYOUT_SUBDEVICE_HOST_PORT,
	{
		id: 'options.minRecordingTime',
		name: 'Minimum recording time',
		type: ConfigManifestEntryType.NUMBER
	}
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.PHAROS] = [
	...PLAYOUT_SUBDEVICE_COMMON,
	PLAYOUT_SUBDEVICE_HOST_PORT[0], // Host only
	{
		id: 'options.spart',
		name: 'Enable SSL',
		type: ConfigManifestEntryType.BOOLEAN
	}
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.OSC] = [
	...PLAYOUT_SUBDEVICE_COMMON,
	...PLAYOUT_SUBDEVICE_HOST_PORT
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.HTTPWATCHER] = [
	...PLAYOUT_SUBDEVICE_COMMON,
	{
		id: 'options.uri',
		name: 'URI',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.httpMethod',
		name: 'HTTPMethod',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.expectedHttpResponse',
		name: 'Expected HTTP Response',
		type: ConfigManifestEntryType.NUMBER
	},
	{
		id: 'options.keyword',
		name: 'Keyword',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.interval',
		name: 'Interval',
		type: ConfigManifestEntryType.NUMBER
	}
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.SISYFOS] = [
	...PLAYOUT_SUBDEVICE_COMMON,
	...PLAYOUT_SUBDEVICE_HOST_PORT
]
PLAYOUT_SUBDEVICE_CONFIG[TSRDeviceType.QUANTEL] = [
	...PLAYOUT_SUBDEVICE_COMMON,
	{
		id: 'options.gatewayUrl',
		name: 'Gateway URL',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.ISAUrl',
		name: 'ISA URL',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.zoneId',
		name: 'Zone ID',
		type: ConfigManifestEntryType.STRING
	},
	{
		id: 'options.serverId',
		name: 'Quantel Server ID',
		type: ConfigManifestEntryType.NUMBER
	}
]

export const TEST_PLAYOUT_DEVICE: DeviceConfigManifest = {
	deviceConfig: [
		{
			id: 'mediaScanner.host',
			name: 'Media Scanner Host',
			type: ConfigManifestEntryType.STRING

		},
		{
			id: 'mediaScanner.port',
			name: 'Media Scanner Port',
			type: ConfigManifestEntryType.NUMBER

		},
		{
			id: 'debugLogging',
			name: 'Activate Debug Logging',
			type: ConfigManifestEntryType.BOOLEAN
		},
		{
			id: 'multiThreading',
			name: 'Activate Multi-Threading',
			type: ConfigManifestEntryType.BOOLEAN
		},
		{
			id: 'multiThreadedResolver',
			name: 'Activate Multi-Threaded Timeline Resolving',
			type: ConfigManifestEntryType.BOOLEAN
		},
		{
			id: 'reportAllCommands',
			name: 'Report command timings on all commands',
			type: ConfigManifestEntryType.BOOLEAN
		},
		{
			id: 'devices',
			name: 'Sub Devices',
			type: ConfigManifestEntryType.TABLE,
			defaultType: TSRDeviceType.ABSTRACT,
			isSubDevices: true,
			deviceTypesMapping: {
				[TSRDeviceType.ABSTRACT]: 0,
				[TSRDeviceType.CASPARCG]: 1,
				[TSRDeviceType.ATEM]: 2,
				[TSRDeviceType.LAWO]: 3,
				[TSRDeviceType.HTTPSEND]: 4,
				[TSRDeviceType.PANASONIC_PTZ]: 5,
				[TSRDeviceType.TCPSEND]: 6,
				[TSRDeviceType.HYPERDECK]: 7,
				[TSRDeviceType.PHAROS]: 8,
				[TSRDeviceType.OSC]: 9,
				[TSRDeviceType.HTTPWATCHER]: 10,
				[TSRDeviceType.SISYFOS]: 11,
				[TSRDeviceType.QUANTEL]: 12,
				0: TSRDeviceType.ABSTRACT,
				1: TSRDeviceType.CASPARCG,
				2: TSRDeviceType.ATEM,
				3: TSRDeviceType.LAWO,
				4: TSRDeviceType.HTTPSEND,
				5: TSRDeviceType.PANASONIC_PTZ,
				6: TSRDeviceType.TCPSEND,
				7: TSRDeviceType.HYPERDECK,
				8: TSRDeviceType.PHAROS,
				9: TSRDeviceType.OSC,
				10: TSRDeviceType.HTTPWATCHER,
				11: TSRDeviceType.SISYFOS,
				12: TSRDeviceType.QUANTEL
			},
			config: PLAYOUT_SUBDEVICE_CONFIG
		}
	]
	// subDeviceConfig: {
	// 	defaultType: TSRDeviceType.ABSTRACT,
	// 	config: PLAYOUT_SUBDEVICE_CONFIG
	// }
}
