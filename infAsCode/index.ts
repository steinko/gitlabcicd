import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as config from "./config"


const kubeconfigFile = process.env.KUBECONFIG;
console.log("kubeconfigfile",kubeconfigFile)
const kubeUrl = process.env.KUBE_URL;
console.log("kubeurl",kubeUrl)
const kubeToken = process.env.KUBE_TOKEN;
console.log("kubeToken",kubeToken)
const kubePemFile = process.env.KUBE_CA_PEM_FILE;
console.log("kubePemFile",kubeNameSpace)
const kubeNameSpace = process.env.KUBE_NAMESPACE;
console.log("kubeNameSpace",kubeNameSpace)

const appLabels = { app: "nginx" };
const deployment = new k8s.apps.v1.Deployment("nginx", {
    spec: {
        selector: { matchLabels: appLabels },
        replicas: 1,
        template: {
            metadata: { labels: appLabels },
            spec: { containers: [{ name: "nginx", image: "nginx" }] }
        }
    }
});


// Create a GKE cluster
const engineVersion = gcp.container.getEngineVersions().then(v => v.latestMasterVersion);
const cluster = new gcp.container.Cluster("cluster", {
	project: config.cloudProject,
	clusterAutoscaling: {enabled: true, resourceLimits:[ {resourceType: 'cpu', minimum:1 ,maximum:20 },
	                                                     {resourceType: 'memory', minimum:1 ,maximum:64 }  
                                                       ]
                        },
    initialNodeCount: 1,
    minMasterVersion: engineVersion,
    nodeVersion: engineVersion,
    nodeConfig: {
        machineType: "e2-medium",
        oauthScopes: [
            "https://www.googleapis.com/auth/compute",
            "https://www.googleapis.com/auth/devstorage.read_only",
            "https://www.googleapis.com/auth/logging.write",
            "https://www.googleapis.com/auth/monitoring"
        ],
    },
   location: config.cloudLocation,
});

// Export the Cluster name
export const clusterName = cluster.name;

// Manufacture a GKE-style kubeconfig. Note that this is slightly "different"
// because of the way GKE requires gcloud to be in the picture for cluster
// authentication (rather than using the client cert/key directly).
export const kubeconfig = pulumi.
    all([ cluster.name, cluster.endpoint, cluster.masterAuth ]).
    apply(([ name, endpoint, masterAuth ]) => {
        const context = `${gcp.config.project}_${gcp.config.zone}_${name}`;
        return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${masterAuth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    auth-provider:
      config:
        cmd-args: config config-helper --format=json
        cmd-path: gcloud
        expiry-key: '{.credential.token_expiry}'
        token-key: '{.credential.access_token}'
      name: gcp
`;
    });

// Create a Kubernetes provider instance that uses our cluster from above.
const clusterProvider = new k8s.Provider("cluster-provider", {
    kubeconfig: kubeconfig,
});