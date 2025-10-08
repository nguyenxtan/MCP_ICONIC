const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const logger = require('../common/logger');
const config = require('../../config');

class TemplateService {
  constructor() {
    this.templatesDir = path.join(__dirname, '../../templates');
    this.templates = new Map();
    this._loadTemplates();
    this._registerHelpers();
  }

  /**
   * Load all templates from templates directory
   * @private
   */
  _loadTemplates() {
    try {
      // Ensure templates directory exists
      if (!fs.existsSync(this.templatesDir)) {
        fs.mkdirSync(this.templatesDir, { recursive: true });
        this._createDefaultTemplates();
      }

      // Load all .md template files
      const files = fs.readdirSync(this.templatesDir)
        .filter(f => f.endsWith('.md'));

      for (const file of files) {
        const templateName = path.basename(file, '.md');
        const templatePath = path.join(this.templatesDir, file);
        const templateContent = fs.readFileSync(templatePath, 'utf-8');

        // Compile template with Handlebars
        this.templates.set(templateName, {
          name: templateName,
          content: templateContent,
          compiled: Handlebars.compile(templateContent)
        });

        logger.info(`Loaded template: ${templateName}`);
      }

      logger.info(`Total templates loaded: ${this.templates.size}`);

    } catch (error) {
      logger.error('Failed to load templates', error);
    }
  }

  /**
   * Register Handlebars helpers
   * @private
   */
  _registerHelpers() {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', function(date, format) {
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString();
      } else if (format === 'long') {
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return d.toISOString().split('T')[0];
    });

    // Uppercase helper
    Handlebars.registerHelper('uppercase', function(str) {
      return str ? str.toUpperCase() : '';
    });

    // Lowercase helper
    Handlebars.registerHelper('lowercase', function(str) {
      return str ? str.toLowerCase() : '';
    });

    // Number formatting helper
    Handlebars.registerHelper('formatNumber', function(num) {
      return num ? num.toLocaleString() : '0';
    });

    // If equals helper
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Math helpers
    Handlebars.registerHelper('add', function(a, b) {
      return a + b;
    });

    Handlebars.registerHelper('subtract', function(a, b) {
      return a - b;
    });

    Handlebars.registerHelper('multiply', function(a, b) {
      return a * b;
    });

    Handlebars.registerHelper('divide', function(a, b) {
      return b !== 0 ? a / b : 0;
    });
  }

  /**
   * Create default templates
   * @private
   */
  _createDefaultTemplates() {
    const defaultTemplates = {
      'weekly-report': `# Weekly Report
**Week of:** {{formatDate weekStart 'short'}} - {{formatDate weekEnd 'short'}}
**Prepared by:** {{author}}

## Summary
{{summary}}

## Accomplishments
{{#each accomplishments}}
- {{this}}
{{/each}}

## Metrics
| Metric | Value | Change |
|--------|-------|--------|
{{#each metrics}}
| {{name}} | {{formatNumber value}} | {{change}} |
{{/each}}

## Challenges
{{#each challenges}}
- **{{title}}**: {{description}}
{{/each}}

## Next Week Plans
{{#each nextWeekPlans}}
- {{this}}
{{/each}}

---
*Generated on {{formatDate generatedDate 'long'}}*
`,

      'project-documentation': `# {{projectName}}

> {{tagline}}

## Overview
{{overview}}

## Features
{{#each features}}
- **{{name}}**: {{description}}
{{/each}}

## Installation

\`\`\`bash
{{installCommand}}
\`\`\`

## Usage

\`\`\`{{language}}
{{usageExample}}
\`\`\`

## API Reference

{{#each apiEndpoints}}
### {{method}} {{path}}
{{description}}

**Parameters:**
{{#each parameters}}
- \`{{name}}\` ({{type}}): {{description}}
{{/each}}

**Response:**
\`\`\`json
{{responseExample}}
\`\`\`

{{/each}}

## Configuration
{{configuration}}

## Contributing
{{contributing}}

## License
{{license}}

---
*Last updated: {{formatDate lastUpdated 'long'}}*
`,

      'meeting-notes': `# Meeting Notes: {{title}}

**Date:** {{formatDate date 'long'}}
**Time:** {{time}}
**Location:** {{location}}
**Attendees:** {{attendees}}

## Agenda
{{#each agenda}}
{{@index}}. {{this}}
{{/each}}

## Discussion

{{#each discussions}}
### {{topic}}
**Led by:** {{leader}}

{{notes}}

**Action Items:**
{{#each actionItems}}
- [ ] {{task}} (Assigned to: {{assignee}}, Due: {{dueDate}})
{{/each}}

{{/each}}

## Decisions Made
{{#each decisions}}
- {{this}}
{{/each}}

## Next Meeting
**Date:** {{nextMeetingDate}}
**Topics:** {{nextMeetingTopics}}

---
*Notes by: {{notesTaker}}*
`,

      'blog-post': `---
title: "{{title}}"
date: {{formatDate date 'default'}}
author: {{author}}
tags: [{{tags}}]
excerpt: "{{excerpt}}"
---

# {{title}}

![{{featuredImageAlt}}]({{featuredImage}})

## Introduction
{{introduction}}

## Main Content

{{#each sections}}
### {{heading}}
{{content}}

{{#if codeExample}}
\`\`\`{{codeLanguage}}
{{codeExample}}
\`\`\`
{{/if}}

{{/each}}

## Conclusion
{{conclusion}}

---

**About the Author:** {{authorBio}}

**Related Posts:**
{{#each relatedPosts}}
- [{{title}}]({{url}})
{{/each}}
`,

      'invoice': '# INVOICE\n\n' +
'**Invoice #:** {{invoiceNumber}}\n' +
'**Date:** {{formatDate invoiceDate \'short\'}}\n' +
'**Due Date:** {{formatDate dueDate \'short\'}}\n\n' +
'## Bill To\n' +
'{{clientName}}\n' +
'{{clientAddress}}\n' +
'{{clientEmail}}\n\n' +
'## From\n' +
'{{companyName}}\n' +
'{{companyAddress}}\n' +
'{{companyEmail}}\n' +
'{{companyPhone}}\n\n' +
'## Items\n\n' +
'| Description | Quantity | Rate | Amount |\n' +
'|-------------|----------|------|--------|\n' +
'{{#each items}}\n' +
'| {{description}} | {{quantity}} | ${{rate}} | ${{multiply quantity rate}} |\n' +
'{{/each}}\n\n' +
'## Summary\n\n' +
'| | |\n' +
'|---|---|\n' +
'| **Subtotal** | ${{formatNumber subtotal}} |\n' +
'| **Tax ({{taxRate}}%)** | ${{formatNumber tax}} |\n' +
'| **Total** | **${{formatNumber total}}** |\n\n' +
'## Payment Terms\n' +
'{{paymentTerms}}\n\n' +
'## Notes\n' +
'{{notes}}\n\n' +
'---\n' +
'*Thank you for your business!*\n'
    };

    // Create template files
    for (const [name, content] of Object.entries(defaultTemplates)) {
      const filePath = path.join(this.templatesDir, `${name}.md`);
      fs.writeFileSync(filePath, content, 'utf-8');
      logger.info(`Created default template: ${name}`);
    }
  }

  /**
   * Render template with data
   * @param {string} templateName - Template name
   * @param {object} data - Data to fill template
   * @returns {string} - Rendered markdown
   */
  render(templateName, data) {
    try {
      const template = this.templates.get(templateName);

      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      logger.info('Rendering template', { templateName, dataKeys: Object.keys(data) });

      // Add default data
      const renderData = {
        generatedDate: new Date(),
        ...data
      };

      // Render template
      const rendered = template.compiled(renderData);

      logger.info('Template rendered successfully', {
        templateName,
        outputLength: rendered.length
      });

      return rendered;

    } catch (error) {
      logger.error('Template rendering failed', error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Get list of available templates
   * @returns {Array} - Template list
   */
  listTemplates() {
    return Array.from(this.templates.values()).map(t => ({
      name: t.name,
      preview: t.content.substring(0, 200) + '...'
    }));
  }

  /**
   * Get template content
   * @param {string} templateName - Template name
   * @returns {string} - Template content
   */
  getTemplate(templateName) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    return template.content;
  }

  /**
   * Create custom template
   * @param {string} templateName - Template name
   * @param {string} content - Template content
   */
  createTemplate(templateName, content) {
    try {
      // Validate template name
      if (!templateName || templateName.includes('/') || templateName.includes('\\')) {
        throw new Error('Invalid template name');
      }

      // Save template file
      const filePath = path.join(this.templatesDir, `${templateName}.md`);
      fs.writeFileSync(filePath, content, 'utf-8');

      // Compile and store
      this.templates.set(templateName, {
        name: templateName,
        content: content,
        compiled: Handlebars.compile(content)
      });

      logger.info(`Created custom template: ${templateName}`);

      return { success: true, message: 'Template created successfully' };

    } catch (error) {
      logger.error('Failed to create template', error);
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Delete template
   * @param {string} templateName - Template name
   */
  deleteTemplate(templateName) {
    try {
      const filePath = path.join(this.templatesDir, `${templateName}.md`);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.templates.delete(templateName);
        logger.info(`Deleted template: ${templateName}`);
        return { success: true, message: 'Template deleted successfully' };
      } else {
        throw new Error(`Template not found: ${templateName}`);
      }

    } catch (error) {
      logger.error('Failed to delete template', error);
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }
}

module.exports = new TemplateService();
