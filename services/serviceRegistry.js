/**
 * Service Registry
 * Centralized dependency injection container for managing service instances
 * Implements Singleton pattern for service management
 */

class ServiceRegistry {
  constructor() {
    if (ServiceRegistry.instance) {
      return ServiceRegistry.instance;
    }

    this.services = new Map();
    this.factories = new Map();
    this.initializing = new Map();
    this.logger = null;

    ServiceRegistry.instance = this;
  }

  /**
   * Set logger for the registry
   * @param {Logger} logger - Logger instance
   */
  setLogger(logger) {
    this.logger = logger;
  }

  /**
   * Register a service factory
   * @param {string} serviceName - Unique service name
   * @param {Function} factory - Factory function that creates the service
   * @param {Object} options - Registration options
   */
  registerFactory(serviceName, factory, options = {}) {
    const { singleton = true, dependencies = [] } = options;

    this.factories.set(serviceName, {
      factory,
      singleton,
      dependencies,
      options
    });

    this.log('📝', `Registered factory for ${serviceName}`);
  }

  /**
   * Register an existing service instance
   * @param {string} serviceName - Unique service name
   * @param {*} instance - Service instance
   */
  register(serviceName, instance) {
    this.services.set(serviceName, instance);
    this.log('✅', `Registered instance for ${serviceName}`);
  }

  /**
   * Get or create a service instance
   * @param {string} serviceName - Service name
   * @returns {Promise<*>} Service instance
   */
  async get(serviceName) {
    // Return existing instance if available
    if (this.services.has(serviceName)) {
      return this.services.get(serviceName);
    }

    // Check if service is already being initialized (prevent circular dependencies)
    if (this.initializing.has(serviceName)) {
      this.warn(`Circular dependency detected for ${serviceName}`);
      return this.initializing.get(serviceName);
    }

    // Get factory configuration
    const factoryConfig = this.factories.get(serviceName);

    if (!factoryConfig) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    // Mark as initializing
    const initPromise = this.createService(serviceName, factoryConfig);
    this.initializing.set(serviceName, initPromise);

    try {
      const instance = await initPromise;

      // Cache if singleton
      if (factoryConfig.singleton) {
        this.services.set(serviceName, instance);
      }

      return instance;
    } finally {
      this.initializing.delete(serviceName);
    }
  }

  /**
   * Create service instance with dependency injection
   * @private
   * @param {string} serviceName - Service name
   * @param {Object} factoryConfig - Factory configuration
   * @returns {Promise<*>} Service instance
   */
  async createService(serviceName, factoryConfig) {
    const { factory, dependencies } = factoryConfig;

    // Resolve dependencies
    const resolvedDeps = await Promise.all(
      dependencies.map(dep => this.get(dep))
    );

    this.log('🔧', `Creating ${serviceName} with dependencies:`, dependencies);

    // Create instance
    const instance = await factory(...resolvedDeps);

    // Auto-initialize if service has initialize method
    if (instance && typeof instance.initialize === 'function' && !instance.isInitialized) {
      await instance.initialize();
    }

    this.log('✅', `Created ${serviceName}`);

    return instance;
  }

  /**
   * Check if service is registered
   * @param {string} serviceName - Service name
   * @returns {boolean} True if registered
   */
  has(serviceName) {
    return this.services.has(serviceName) || this.factories.has(serviceName);
  }

  /**
   * Remove service from registry
   * @param {string} serviceName - Service name
   */
  unregister(serviceName) {
    const instance = this.services.get(serviceName);

    // Call destroy if available
    if (instance && typeof instance.destroy === 'function') {
      instance.destroy();
    }

    this.services.delete(serviceName);
    this.factories.delete(serviceName);
    this.log('🗑️', `Unregistered ${serviceName}`);
  }

  /**
   * Clear all services
   */
  clear() {
    // Destroy all instances
    for (const [name, instance] of this.services) {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    }

    this.services.clear();
    this.factories.clear();
    this.initializing.clear();
    this.log('🔄', 'Registry cleared');
  }

  /**
   * Get all registered service names
   * @returns {Array<string>} Service names
   */
  getServiceNames() {
    const factoryNames = Array.from(this.factories.keys());
    const instanceNames = Array.from(this.services.keys());
    return [...new Set([...factoryNames, ...instanceNames])];
  }

  /**
   * Get registry status
   * @returns {Object} Status information
   */
  getStatus() {
    const status = {};

    for (const serviceName of this.getServiceNames()) {
      const instance = this.services.get(serviceName);
      status[serviceName] = {
        registered: this.factories.has(serviceName),
        instantiated: this.services.has(serviceName),
        status: instance && typeof instance.getStatus === 'function'
          ? instance.getStatus()
          : null
      };
    }

    return status;
  }

  /**
   * Initialize all registered services
   * @returns {Promise<void>}
   */
  async initializeAll() {
    this.log('🚀', 'Initializing all services...');

    const serviceNames = Array.from(this.factories.keys());

    await Promise.all(
      serviceNames.map(name => this.get(name).catch(error => {
        this.warn(`Failed to initialize ${name}:`, error);
      }))
    );

    this.log('✅', 'All services initialized');
  }

  /**
   * Log helper
   * @private
   */
  log(emoji, message, ...args) {
    if (this.logger) {
      this.logger.log(emoji, message, ...args);
    } else {
      console.log(`${emoji} [ServiceRegistry]`, message, ...args);
    }
  }

  /**
   * Warn helper
   * @private
   */
  warn(message, ...args) {
    if (this.logger) {
      this.logger.warn(message, ...args);
    } else {
      console.warn(`⚠️ [ServiceRegistry]`, message, ...args);
    }
  }
}

// Create and export singleton instance
const serviceRegistry = new ServiceRegistry();

if (typeof window !== 'undefined') {
  window.ServiceRegistry = ServiceRegistry;
  window.serviceRegistry = serviceRegistry;
  console.log('✅ ServiceRegistry exported to window');
} else {
  console.error('❌ Window object not available - ServiceRegistry not exported');
}
