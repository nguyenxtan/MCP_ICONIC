const templateService = require('../modules/templates/template.service');

describe('Template Service', () => {
  describe('Template Listing', () => {
    test('should list all available templates', () => {
      const templates = templateService.listTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);

      const templateNames = templates.map(t => t.name);
      expect(templateNames).toContain('weekly-report');
      expect(templateNames).toContain('project-documentation');
      expect(templateNames).toContain('meeting-notes');
    });

    test('each template should have name and preview', () => {
      const templates = templateService.listTemplates();

      templates.forEach(template => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('preview');
        expect(typeof template.name).toBe('string');
        expect(typeof template.preview).toBe('string');
      });
    });
  });

  describe('Get Template', () => {
    test('should get template content by name', () => {
      const content = templateService.getTemplate('weekly-report');

      expect(content).toBeDefined();
      expect(content).toContain('Weekly Report');
      expect(content).toContain('{{'));
    });

    test('should throw error for non-existent template', () => {
      expect(() => {
        templateService.getTemplate('non-existent-template');
      }).toThrow('Template not found');
    });
  });

  describe('Render Template', () => {
    test('should render weekly-report template', () => {
      const data = {
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        author: 'John Doe',
        summary: 'Great week!',
        accomplishments: [
          'Completed feature X',
          'Fixed bug Y'
        ],
        metrics: [
          { name: 'Sales', value: 50000, change: '+10%' },
          { name: 'Users', value: 1200, change: '+5%' }
        ],
        challenges: [
          { title: 'Performance', description: 'Need optimization' }
        ],
        nextWeekPlans: [
          'Start feature Z'
        ]
      };

      const rendered = templateService.render('weekly-report', data);

      expect(rendered).toContain('Weekly Report');
      expect(rendered).toContain('John Doe');
      expect(rendered).toContain('Great week!');
      expect(rendered).toContain('Completed feature X');
      expect(rendered).toContain('Sales');
      expect(rendered).toContain('50,000');
    });

    test('should render project-documentation template', () => {
      const data = {
        projectName: 'Awesome Project',
        tagline: 'The best project ever',
        overview: 'This project does amazing things.',
        features: [
          { name: 'Feature 1', description: 'Does X' },
          { name: 'Feature 2', description: 'Does Y' }
        ],
        installCommand: 'npm install awesome-project',
        language: 'javascript',
        usageExample: 'const app = require("awesome-project");',
        apiEndpoints: [],
        configuration: 'Configure via .env file',
        contributing: 'PRs welcome!',
        license: 'MIT',
        lastUpdated: new Date()
      };

      const rendered = templateService.render('project-documentation', data);

      expect(rendered).toContain('Awesome Project');
      expect(rendered).toContain('The best project ever');
      expect(rendered).toContain('Feature 1');
      expect(rendered).toContain('npm install awesome-project');
    });

    test('should render meeting-notes template', () => {
      const data = {
        title: 'Sprint Planning',
        date: new Date('2024-01-15'),
        time: '10:00 AM',
        location: 'Conference Room A',
        attendees: 'John, Jane, Bob',
        agenda: ['Review backlog', 'Plan sprint'],
        discussions: [
          {
            topic: 'New Feature',
            leader: 'John',
            notes: 'Discussed implementation',
            actionItems: [
              { task: 'Create design doc', assignee: 'Jane', dueDate: '2024-01-20' }
            ]
          }
        ],
        decisions: ['Approved feature X'],
        nextMeetingDate: '2024-01-22',
        nextMeetingTopics: 'Sprint review',
        notesTaker: 'Bob'
      };

      const rendered = templateService.render('meeting-notes', data);

      expect(rendered).toContain('Sprint Planning');
      expect(rendered).toContain('Conference Room A');
      expect(rendered).toContain('Review backlog');
      expect(rendered).toContain('New Feature');
    });

    test('should handle Handlebars helpers', () => {
      const data = {
        projectName: 'test',
        tagline: 'Test',
        overview: 'test',
        features: [],
        installCommand: 'test',
        language: 'js',
        usageExample: 'test',
        apiEndpoints: [],
        configuration: 'test',
        contributing: 'test',
        license: 'MIT',
        lastUpdated: new Date('2024-01-15')
      };

      const rendered = templateService.render('project-documentation', data);

      // Should contain formatted date
      expect(rendered).toMatch(/January|February|March|April|May|June|July|August|September|October|November|December/);
    });

    test('should throw error for missing template', () => {
      expect(() => {
        templateService.render('non-existent', {});
      }).toThrow('Template not found');
    });
  });

  describe('Create Custom Template', () => {
    const customTemplateName = 'test-custom-template';

    afterEach(() => {
      // Cleanup: delete test template
      try {
        templateService.deleteTemplate(customTemplateName);
      } catch (e) {
        // Ignore if template doesn't exist
      }
    });

    test('should create custom template', () => {
      const content = '# {{title}}\n\n{{content}}';

      const result = templateService.createTemplate(customTemplateName, content);

      expect(result.success).toBe(true);
      expect(result.message).toContain('created successfully');

      // Verify template exists
      const retrieved = templateService.getTemplate(customTemplateName);
      expect(retrieved).toBe(content);
    });

    test('should render custom template', () => {
      const content = '# {{title}}\n\n{{content}}';
      templateService.createTemplate(customTemplateName, content);

      const rendered = templateService.render(customTemplateName, {
        title: 'My Title',
        content: 'My content here'
      });

      expect(rendered).toContain('# My Title');
      expect(rendered).toContain('My content here');
    });

    test('should reject invalid template names', () => {
      expect(() => {
        templateService.createTemplate('../invalid', 'content');
      }).toThrow('Invalid template name');

      expect(() => {
        templateService.createTemplate('path/to/template', 'content');
      }).toThrow('Invalid template name');
    });
  });

  describe('Delete Template', () => {
    test('should delete existing template', () => {
      const testName = 'test-delete-template';
      const content = '# Test';

      // Create template
      templateService.createTemplate(testName, content);

      // Delete it
      const result = templateService.deleteTemplate(testName);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');

      // Verify it's gone
      expect(() => {
        templateService.getTemplate(testName);
      }).toThrow('Template not found');
    });

    test('should throw error when deleting non-existent template', () => {
      expect(() => {
        templateService.deleteTemplate('non-existent-template-xyz');
      }).toThrow('Template not found');
    });
  });
});
